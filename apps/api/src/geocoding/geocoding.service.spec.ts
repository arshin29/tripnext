import { Test, TestingModule } from '@nestjs/testing';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeocodingService],
    }).compile();

    service = module.get<GeocodingService>(GeocodingService);
    service.clearCacheForTesting();
    service.setIntervalForTesting(50); // fast 50ms interval for tests
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Query Validation & Edge Cases', () => {
    it('should return empty array for empty or whitespace query', async () => {
      const results = await service.geocode('   ');
      expect(results).toEqual([]);
      expect(service.getCacheSize()).toBe(0);
    });

    it('should return empty array for single character query', async () => {
      const results = await service.geocode('a');
      expect(results).toEqual([]);
      expect(service.getCacheSize()).toBe(0);
    });
  });

  describe('cleanQuery', () => {
    it('should remove parenthetical content and deduplicate context tokens', () => {
      const q1 = service.cleanQuery('Kinkaku-ji (Golden Pavilion), Kyoto', 'Kyoto, Japan');
      expect(q1).toBe('Kinkaku-ji, Kyoto, Japan');
    });

    it('should remove ampersands and secondary compound landmarks', () => {
      const q2 = service.cleanQuery('Eiffel Tower & Champ de Mars, Paris', 'Paris, France');
      expect(q2).toBe('Eiffel Tower, Paris, France');
    });

    it('should remove descriptive fluff suffixes that hinder Nominatim lookups', () => {
      const q3 = service.cleanQuery('Gion Geisha District, Kyoto', 'Kyoto, Japan');
      expect(q3).toBe('Gion, Kyoto, Japan');

      const q4 = service.cleanQuery('Akihabara Tech District, Tokyo', 'Tokyo, Japan');
      expect(q4).toBe('Akihabara, Tokyo, Japan');
    });

    it('should strip day prefixes from itinerary titles', () => {
      const q5 = service.cleanQuery('Day 1 - Senso-ji Temple', 'Tokyo, Japan');
      expect(q5).toBe('Senso-ji Temple, Tokyo, Japan');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache results and avoid duplicate upstream calls for identical queries', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            lat: '35.6762',
            lon: '139.6503',
            display_name: 'Tokyo, Japan',
          },
        ],
      });
      global.fetch = mockFetch as any;

      const first = await service.geocode('Tokyo', 'Japan');
      expect(first).toHaveLength(1);
      expect(first[0].latitude).toBe(35.6762);
      expect(first[0].longitude).toBe(139.6503);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second identical query (different casing/spacing) should hit cache directly
      const second = await service.geocode('  TOKYO  ', 'Japan');
      expect(second).toEqual(first);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1, did not call remote again
      expect(service.getCacheSize()).toBe(1);
    });
  });

  describe('Queue Serialization & Minimum Interval', () => {
    it('should serialize concurrent requests and enforce the minimum time interval', async () => {
      const callTimestamps: number[] = [];

      const mockFetch = jest.fn().mockImplementation(async (url: string) => {
        callTimestamps.push(Date.now());
        const isKyoto = url.includes('Kyoto');
        return {
          ok: true,
          json: async () => [
            {
              lat: isKyoto ? '35.0116' : '34.6937',
              lon: isKyoto ? '135.7681' : '135.5023',
              display_name: isKyoto ? 'Kyoto, Japan' : 'Osaka, Japan',
            },
          ],
        };
      });
      global.fetch = mockFetch as any;

      service.setIntervalForTesting(60); // 60ms gap

      const [res1, res2] = await Promise.all([
        service.geocode('Kyoto'),
        service.geocode('Osaka'),
      ]);

      expect(res1).toHaveLength(1);
      expect(res2).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(callTimestamps).toHaveLength(2);

      const elapsed = callTimestamps[1] - callTimestamps[0];
      expect(elapsed).toBeGreaterThanOrEqual(50); // Enforced at least the minimum interval
    });
  });

  describe('Upstream Timeout & Error Handling', () => {
    it('should handle upstream timeout gracefully without throwing', async () => {
      service.setTimeoutForTesting(30);

      const mockFetch = jest.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        return new Promise((_, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      });
      global.fetch = mockFetch as any;

      const results = await service.geocode('Timeout Landmark');
      expect(results).toEqual([]);
    });

    it('should handle non-200 HTTP responses gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }) as any;

      const results = await service.geocode('Service Unavailable City');
      expect(results).toEqual([]);
    });

    it('should filter out invalid or out-of-range coordinates from upstream payload', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { lat: 'not-a-number', lon: '139.6503', display_name: 'Invalid Lat' },
          { lat: '120.0000', lon: '139.6503', display_name: 'Out of range Lat' },
          { lat: '35.6762', lon: '200.0000', display_name: 'Out of range Lon' },
          { lat: '35.6762', lon: '139.6503', display_name: 'Valid Landmark' },
        ],
      }) as any;

      const results = await service.geocode('Mixed Coordinates');
      expect(results).toHaveLength(1);
      expect(results[0].displayName).toBe('Valid Landmark');
      expect(results[0].latitude).toBe(35.6762);
      expect(results[0].longitude).toBe(139.6503);
    });
  });
});
