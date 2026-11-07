import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { AiService } from './ai.service';
import { FallbackConciergeService } from './fallback-concierge.service';

const mockGenerateContent = jest.fn();

jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: mockGenerateContent,
      },
    })),
    Type: {
      OBJECT: 'OBJECT',
      ARRAY: 'ARRAY',
      STRING: 'STRING',
      NUMBER: 'NUMBER',
      INTEGER: 'INTEGER',
      BOOLEAN: 'BOOLEAN',
    },
  };
});

describe('AiService', () => {
  let service: AiService;
  let prismaService: any;
  let tripsService: any;
  let fallbackService: any;
  let configService: any;

  const mockTrip = {
    id: 'trip-100',
    userId: 'user-1',
    destinationId: 'dest-1',
    title: 'Tokyo Explorer',
    destination: {
      id: 'dest-1',
      name: 'Tokyo',
      city: 'Tokyo',
      country: 'Japan',
      attractions: ['Senso-ji', 'Tokyo Skytree', 'Meiji Shrine'],
    },
    itineraryDays: [
      {
        id: 'day-1',
        tripId: 'trip-100',
        dayNumber: 1,
        date: new Date('2026-11-10'),
        activities: [],
      },
      {
        id: 'day-2',
        tripId: 'trip-100',
        dayNumber: 2,
        date: new Date('2026-11-11'),
        activities: [],
      },
    ],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaService = {
      activity: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        const tx = {
          $queryRaw: jest.fn().mockResolvedValue([]),
          activity: {
            findMany: prismaService.activity.findMany,
            create: jest.fn().mockImplementation((args) => {
              return Promise.resolve({
                id: `act-${Math.random().toString(36).substring(7)}`,
                ...args.data,
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }),
          },
        };
        return callback(tx);
      }),
    };

    tripsService = {
      validateTripAccess: jest.fn().mockResolvedValue({
        trip: mockTrip,
        role: 'OWNER',
      }),
    };

    fallbackService = {
      generateCuratedSuggestions: jest.fn().mockReturnValue({
        tripId: 'trip-100',
        destinationName: 'Tokyo',
        source: 'CURATED_FALLBACK',
        modelUsed: null,
        suggestions: [],
        disclaimer: 'Curated disclaimer',
      }),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'geminiApiKey') return 'test-gemini-key';
        if (key === 'geminiModel') return 'gemini-3.8-flash';
        if (key === 'aiTimeoutMs') return 20000;
        if (key === 'aiRateLimitMaxPerMinute') return 5;
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: prismaService },
        { provide: ConfigService, useValue: configService },
        { provide: TripsService, useValue: tripsService },
        { provide: FallbackConciergeService, useValue: fallbackService },
        { provide: GeocodingService, useValue: { geocode: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSuggestions', () => {
    it('should use Gemini model when configured and return parsed suggestions', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          summary: 'A fantastic Tokyo journey.',
          suggestions: [
            {
              dayNumber: 1,
              title: 'Senso-ji Morning Visit',
              description: 'Explore the historic temple grounds.',
              location: 'Asakusa, Tokyo',
              latitude: 35.7147,
              longitude: 139.7967,
              startTime: '09:30',
              durationMinutes: 120,
              notes: 'Arrive early.',
              estimatedCost: 0,
              currency: 'JPY',
              tags: ['Culture', 'Historic'],
            },
            {
              dayNumber: 2,
              title: 'Meiji Shrine Stroll',
              description: 'Serene forest walking path.',
              location: 'Shibuya, Tokyo',
              latitude: 35.6764,
              longitude: 139.6993,
              startTime: '10:00',
              durationMinutes: 90,
              notes: 'Wear comfortable shoes.',
              estimatedCost: 0,
              currency: 'JPY',
              tags: ['Nature', 'Peaceful'],
            },
          ],
        }),
      });

      const result = await service.generateSuggestions('user-1', 'trip-100', {
        pace: 'BALANCED',
      });

      expect(result.source).toBe('GEMINI');
      expect(result.modelUsed).toBe('gemini-3.8-flash');
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].itineraryDayId).toBe('day-1');
      expect(result.suggestions[1].itineraryDayId).toBe('day-2');
      expect(result.suggestions[0].latitude).toBe(35.7147);
      expect(result.suggestions[0].longitude).toBe(139.7967);
    });

    it('should nullify invalid or one-sided coordinates in Gemini response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify({
          suggestions: [
            {
              dayNumber: 1,
              title: 'Attraction with invalid coords',
              latitude: 195.0, // out of range
              longitude: 139.7967,
              durationMinutes: 60,
            },
            {
              dayNumber: 2,
              title: 'Attraction with one-sided coord',
              latitude: 35.0,
              longitude: null,
              durationMinutes: 60,
            },
          ],
        }),
      });

      const result = await service.generateSuggestions('user-1', 'trip-100', {});

      expect(result.suggestions[0].latitude).toBeNull();
      expect(result.suggestions[0].longitude).toBeNull();
      expect(result.suggestions[1].latitude).toBeNull();
      expect(result.suggestions[1].longitude).toBeNull();
    });

    it('should fall back to FallbackConciergeService on Gemini error', async () => {
      mockGenerateContent.mockRejectedValueOnce(
        new Error('Google Gen AI 429 Quota Exceeded'),
      );

      const result = await service.generateSuggestions('user-1', 'trip-100', {});

      expect(fallbackService.generateCuratedSuggestions).toHaveBeenCalledWith(
        mockTrip,
        {},
      );
      expect(result.source).toBe('CURATED_FALLBACK');
    });

    it('should fall back to FallbackConciergeService when Gemini API key is missing', async () => {
      // Re-create service without API key
      configService.get.mockImplementation((k: string) => {
        if (k === 'geminiApiKey') return undefined;
        return null;
      });

      const moduleNoKey = await Test.createTestingModule({
        providers: [
          AiService,
          { provide: PrismaService, useValue: prismaService },
          { provide: ConfigService, useValue: configService },
          { provide: TripsService, useValue: tripsService },
          { provide: FallbackConciergeService, useValue: fallbackService },
          { provide: GeocodingService, useValue: { geocode: jest.fn().mockResolvedValue([]) } },
        ],
      }).compile();

      const serviceNoKey = moduleNoKey.get<AiService>(AiService);

      const result = await serviceNoKey.generateSuggestions(
        'user-1',
        'trip-100',
        {},
      );

      expect(fallbackService.generateCuratedSuggestions).toHaveBeenCalled();
      expect(result.source).toBe('CURATED_FALLBACK');
    });
  });

  describe('importProposals', () => {
    it('should throw BadRequestException if proposal day ID does not belong to trip', async () => {
      await expect(
        service.importProposals('user-1', 'trip-100', {
          proposals: [
            {
              itineraryDayId: 'foreign-day-id',
              title: 'Alien activity',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if coordinates are not provided as a pair', async () => {
      await expect(
        service.importProposals('user-1', 'trip-100', {
          proposals: [
            {
              itineraryDayId: 'day-1',
              title: 'Activity with solo latitude',
              latitude: 35.0,
              longitude: null,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should skip duplicate activity titles on the same day and import new ones with correct sortOrder', async () => {
      // Existing activity on day-1 has title "senso-ji"
      prismaService.activity.findMany.mockResolvedValueOnce([
        {
          id: 'existing-1',
          itineraryDayId: 'day-1',
          title: 'Senso-ji',
          sortOrder: 0,
        },
      ]);

      const result = await service.importProposals('user-1', 'trip-100', {
        proposals: [
          {
            itineraryDayId: 'day-1',
            title: 'Senso-ji', // Duplicate -> should skip
          },
          {
            itineraryDayId: 'day-1',
            title: 'Tokyo Skytree', // New -> should import with sortOrder 1
            latitude: 35.71,
            longitude: 139.81,
          },
          {
            itineraryDayId: 'day-2',
            title: 'Meiji Shrine', // New on day 2 -> sortOrder 0
          },
        ],
      });

      expect(result.importedCount).toBe(2);
      expect(result.skippedCount).toBe(1);
      expect(result.importedActivities).toHaveLength(2);
      expect(result.importedActivities[0].title).toBe('Tokyo Skytree');
      expect(result.importedActivities[0].sortOrder).toBe(1);
      expect(result.importedActivities[1].title).toBe('Meiji Shrine');
      expect(result.importedActivities[1].sortOrder).toBe(0);
    });
  });
});
