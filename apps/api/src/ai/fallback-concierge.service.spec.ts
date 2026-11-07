import { Test, TestingModule } from '@nestjs/testing';
import { FallbackConciergeService } from './fallback-concierge.service';

describe('FallbackConciergeService', () => {
  let service: FallbackConciergeService;

  const mockTrip = {
    id: 'trip-123',
    userId: 'user-1',
    destinationId: 'dest-1',
    title: 'Kyoto Cultural Journey',
    description: 'Exploring Kyoto',
    startDate: new Date('2026-12-01'),
    endDate: new Date('2026-12-03'),
    budget: 1500,
    currency: 'USD',
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    destination: {
      id: 'dest-1',
      name: 'Kyoto',
      slug: 'kyoto',
      city: 'Kyoto',
      country: 'Japan',
      shortDescription: 'Historic capital of Japan',
      detailedDescription: 'Famous for classic Buddhist temples, gardens, imperial palaces.',
      category: 'Cultural',
      coverImage: 'https://example.com/kyoto.jpg',
      galleryImages: [],
      attractions: [
        'Fushimi Inari Shrine',
        'Kinkaku-ji (Golden Pavilion)',
        'Arashiyama Bamboo Grove',
        'Kiyomizu-dera',
      ],
      bestTimeToVisit: 'March to May',
      approximateDuration: '4-5 days',
      isFeatured: true,
      latitude: 35.0116,
      longitude: 135.7681,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    itineraryDays: [
      {
        id: 'day-1',
        tripId: 'trip-123',
        dayNumber: 1,
        date: new Date('2026-12-01'),
        title: 'Day 1',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        activities: [],
      },
      {
        id: 'day-2',
        tripId: 'trip-123',
        dayNumber: 2,
        date: new Date('2026-12-02'),
        title: 'Day 2',
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        activities: [],
      },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FallbackConciergeService],
    }).compile();

    service = module.get<FallbackConciergeService>(FallbackConciergeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return source CURATED_FALLBACK and null modelUsed', () => {
    const result = service.generateCuratedSuggestions(mockTrip as any);
    expect(result.source).toBe('CURATED_FALLBACK');
    expect(result.modelUsed).toBeNull();
    expect(result.destinationName).toBe('Kyoto');
    expect(result.disclaimer).toContain('curated recommendations');
  });

  it('should strictly use only genuine attractions from the destination', () => {
    const result = service.generateCuratedSuggestions(mockTrip as any);
    const validAttractions = mockTrip.destination.attractions;

    for (const proposal of result.suggestions) {
      expect(validAttractions).toContain(proposal.title);
    }
  });

  it('should leave latitude, longitude, and estimatedCost strictly null (no fabrication)', () => {
    const result = service.generateCuratedSuggestions(mockTrip as any);

    for (const proposal of result.suggestions) {
      expect(proposal.latitude).toBeNull();
      expect(proposal.longitude).toBeNull();
      expect(proposal.estimatedCost).toBeNull();
      expect(proposal.currency).toBeNull();
    }
  });

  it('should generate 1 activity per day for RELAXED pace', () => {
    const result = service.generateCuratedSuggestions(mockTrip as any, {
      pace: 'RELAXED',
    });
    // 2 days * 1 slot = 2 proposals
    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].dayNumber).toBe(1);
    expect(result.suggestions[0].itineraryDayId).toBe('day-1');
    expect(result.suggestions[1].dayNumber).toBe(2);
    expect(result.suggestions[1].itineraryDayId).toBe('day-2');
  });

  it('should generate 2 activities per day for BALANCED pace with distinct times', () => {
    const result = service.generateCuratedSuggestions(mockTrip as any, {
      pace: 'BALANCED',
    });
    // 2 days * 2 slots = 4 proposals
    expect(result.suggestions).toHaveLength(4);
    const day1Proposals = result.suggestions.filter((p) => p.dayNumber === 1);
    expect(day1Proposals).toHaveLength(2);
    expect(day1Proposals[0].startTime).toBe('09:30');
    expect(day1Proposals[1].startTime).toBe('14:30');
  });

  it('should generate 3 activities per day for INTENSIVE pace', () => {
    const result = service.generateCuratedSuggestions(mockTrip as any, {
      pace: 'INTENSIVE',
    });
    // 2 days * 3 slots = 6 proposals
    expect(result.suggestions).toHaveLength(6);
    const day1Proposals = result.suggestions.filter((p) => p.dayNumber === 1);
    expect(day1Proposals).toHaveLength(3);
    expect(day1Proposals[0].startTime).toBe('09:00');
    expect(day1Proposals[1].startTime).toBe('14:00');
    expect(day1Proposals[2].startTime).toBe('18:30');
  });

  it('should treat PACKED pace alias identically to INTENSIVE (3 activities per day)', () => {
    const result = service.generateCuratedSuggestions(mockTrip as any, {
      pace: 'PACKED',
    });
    expect(result.suggestions).toHaveLength(6);
    expect(result.proposals).toHaveLength(6);
  });

  it('should handle destination with empty attractions gracefully', () => {
    const tripWithoutAttractions = {
      ...mockTrip,
      destination: {
        ...mockTrip.destination,
        attractions: [],
      },
    };

    const result = service.generateCuratedSuggestions(
      tripWithoutAttractions as any,
    );
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.source).toBe('CURATED_FALLBACK');
  });
});
