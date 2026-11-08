import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ItineraryService } from './itinerary.service';
import { TripsService } from './trips.service';

import { GeocodingService } from '../geocoding/geocoding.service';

describe('ItineraryService', () => {
  let service: ItineraryService;
  let tripsService: {
    validateTripOwnership: jest.Mock;
    validateTripAccess: jest.Mock;
  };
  let prisma: {
    itineraryDay: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    activity: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockDate = new Date('2026-06-01T00:00:00.000Z');
  const mockTrip = {
    id: 'trip-1',
    userId: 'user-1',
    startDate: mockDate,
    endDate: new Date('2026-06-05T00:00:00.000Z'),
  };

  const mockDay = {
    id: 'day-1',
    tripId: 'trip-1',
    dayNumber: 1,
    date: mockDate,
    title: 'Arrival',
    notes: 'Check into machiya',
    createdAt: mockDate,
    updatedAt: mockDate,
    activities: [],
  };

  const mockActivity = {
    id: 'act-1',
    itineraryDayId: 'day-1',
    title: 'Tea Tasting',
    description: 'Traditional Gion tea house',
    location: 'Gion',
    startTime: '15:00',
    durationMinutes: 60,
    notes: 'Reservation confirmed',
    sortOrder: 1,
    isCompleted: false,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    tripsService = {
      validateTripOwnership: jest.fn().mockResolvedValue(mockTrip),
      validateTripAccess: jest.fn().mockResolvedValue({ trip: mockTrip, role: 'OWNER' }),
    };

    prisma = {
      itineraryDay: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      activity: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn((callback) =>
        Array.isArray(callback) ? Promise.all(callback) : callback(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItineraryService,
        { provide: TripsService, useValue: tripsService },
        { provide: PrismaService, useValue: prisma },
        { provide: GeocodingService, useValue: { geocode: jest.fn().mockResolvedValue([]) } },
      ],
    }).compile();

    service = module.get<ItineraryService>(ItineraryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getItinerary', () => {
    it('should return days with activities ordered by dayNumber and sortOrder', async () => {
      prisma.itineraryDay.findMany.mockResolvedValue([
        { ...mockDay, activities: [mockActivity] },
      ]);

      const result = await service.getItinerary('user-1', 'trip-1');

      expect(result).toHaveLength(1);
      expect(result[0].dayNumber).toBe(1);
      expect(result[0].activities).toHaveLength(1);
      expect(tripsService.validateTripAccess).toHaveBeenCalledWith('user-1', 'trip-1');
    });
  });

  describe('createDay', () => {
    it('should throw BadRequestException if date is outside trip range', async () => {
      await expect(
        service.createDay('user-1', 'trip-1', {
          date: '2026-07-01',
          dayNumber: 6,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create day within valid date range', async () => {
      prisma.itineraryDay.findUnique
        .mockResolvedValueOnce(null) // dayNumber check
        .mockResolvedValueOnce(null); // date check

      prisma.itineraryDay.create.mockResolvedValue({
        ...mockDay,
        dayNumber: 2,
        date: new Date('2026-06-02T00:00:00.000Z'),
        activities: [],
      });

      const day = await service.createDay('user-1', 'trip-1', {
        date: '2026-06-02',
        dayNumber: 2,
        title: 'Exploring Arashiyama',
      });

      expect(day.dayNumber).toBe(2);
      expect(prisma.itineraryDay.create).toHaveBeenCalled();
    });
  });

  describe('createActivity', () => {
    it('should create activity and calculate next sortOrder', async () => {
      prisma.itineraryDay.findFirst.mockResolvedValue(mockDay);
      prisma.activity.findFirst.mockResolvedValue(mockActivity); // last sortOrder is 1
      prisma.activity.create.mockResolvedValue({
        ...mockActivity,
        id: 'act-2',
        sortOrder: 2,
      });

      const act = await service.createActivity('user-1', 'trip-1', {
        itineraryDayId: 'day-1',
        title: 'Bamboo Forest Walk',
      });

      expect(act.sortOrder).toBe(2);
      expect(prisma.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sortOrder: 2,
            title: 'Bamboo Forest Walk',
          }),
        }),
      );
    });

    it('should throw BadRequestException if latitude is provided without longitude', async () => {
      prisma.itineraryDay.findFirst.mockResolvedValue(mockDay);

      await expect(
        service.createActivity('user-1', 'trip-1', {
          itineraryDayId: 'day-1',
          title: 'Bamboo Forest Walk',
          latitude: 35.0116,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if longitude is provided without latitude', async () => {
      prisma.itineraryDay.findFirst.mockResolvedValue(mockDay);

      await expect(
        service.createActivity('user-1', 'trip-1', {
          itineraryDayId: 'day-1',
          title: 'Bamboo Forest Walk',
          longitude: 135.7681,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save coordinates when valid pair is provided', async () => {
      prisma.itineraryDay.findFirst.mockResolvedValue(mockDay);
      prisma.activity.findFirst.mockResolvedValue(null);
      prisma.activity.create.mockResolvedValue({
        ...mockActivity,
        latitude: 35.0116,
        longitude: 135.7681,
      });

      const act = await service.createActivity('user-1', 'trip-1', {
        itineraryDayId: 'day-1',
        title: 'Fushimi Inari Shrine',
        latitude: 35.0116,
        longitude: 135.7681,
      });

      expect(act.latitude).toBe(35.0116);
      expect(act.longitude).toBe(135.7681);
    });
  });

  describe('toggleComplete', () => {
    it('should toggle isCompleted flag', async () => {
      prisma.activity.findFirst.mockResolvedValue(mockActivity); // isCompleted: false
      prisma.activity.update.mockResolvedValue({
        ...mockActivity,
        isCompleted: true,
      });

      const act = await service.toggleComplete('user-1', 'trip-1', 'act-1');

      expect(act.isCompleted).toBe(true);
      expect(prisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'act-1' },
        data: { isCompleted: true },
      });
    });
  });

  describe('reorderActivities', () => {
    it('should reorder activities in a transaction', async () => {
      prisma.itineraryDay.findFirst.mockResolvedValue({
        ...mockDay,
        activities: [{ id: 'act-1' }, { id: 'act-2' }],
      });
      prisma.activity.findMany.mockResolvedValue([
        { ...mockActivity, id: 'act-2', sortOrder: 1 },
        { ...mockActivity, id: 'act-1', sortOrder: 2 },
      ]);

      const result = await service.reorderActivities('user-1', 'trip-1', {
        itineraryDayId: 'day-1',
        activityIds: ['act-2', 'act-1'],
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('geocodeUnmappedActivities', () => {
    it('should return 0 resolved when all activities already have coordinates', async () => {
      prisma.itineraryDay.findMany.mockResolvedValue([
        {
          ...mockDay,
          activities: [{ ...mockActivity, latitude: 35.0116, longitude: 135.7681 }],
        },
      ]);

      const result = await service.geocodeUnmappedActivities('user-1', 'trip-1');

      expect(result.totalAttempted).toBe(0);
      expect(result.resolvedCount).toBe(0);
      expect(result.unmappedCount).toBe(0);
      expect(result.activities).toHaveLength(0);
    });

    it('should resolve coordinates for unmapped activities', async () => {
      prisma.itineraryDay.findMany.mockResolvedValue([
        {
          ...mockDay,
          activities: [
            {
              ...mockActivity,
              id: 'act-unmapped-1',
              title: 'Gion Corner',
              location: 'Gion, Kyoto',
              latitude: null,
              longitude: null,
            },
          ],
        },
      ]);

      const geocodingService = (service as any).geocodingService;
      geocodingService.geocode.mockResolvedValueOnce([
        { latitude: 35.0037, longitude: 135.7772, displayName: 'Gion Corner' },
      ]);

      prisma.activity.update.mockResolvedValueOnce({
        ...mockActivity,
        id: 'act-unmapped-1',
        title: 'Gion Corner',
        location: 'Gion, Kyoto',
        latitude: 35.0037,
        longitude: 135.7772,
      });

      const result = await service.geocodeUnmappedActivities('user-1', 'trip-1');

      expect(result.totalAttempted).toBe(1);
      expect(result.resolvedCount).toBe(1);
      expect(result.unmappedCount).toBe(0);
      expect(result.activities).toHaveLength(1);
      expect(result.activities[0].latitude).toBe(35.0037);
      expect(result.activities[0].longitude).toBe(135.7772);
      expect(prisma.activity.update).toHaveBeenCalledWith({
        where: { id: 'act-unmapped-1' },
        data: { latitude: 35.0037, longitude: 135.7772 },
      });
    });

    it('should accurately process seven unmapped activities and update all resolved records', async () => {
      const sevenStops = [
        { id: 'act-1', title: 'Kinkaku-ji (Golden Pavilion)', location: 'Kinkaku-ji (Golden Pavilion), Kyoto' },
        { id: 'act-2', title: 'Gion Geisha District', location: 'Gion, Kyoto' },
        { id: 'act-3', title: 'Fushimi Inari Shrine', location: 'Fushimi Inari, Kyoto' },
        { id: 'act-4', title: 'Arashiyama Bamboo Grove', location: 'Arashiyama, Kyoto' },
        { id: 'act-5', title: 'Kiyomizu-dera Temple', location: 'Kiyomizu-dera, Kyoto' },
        { id: 'act-6', title: 'Nijo Castle', location: 'Nijo Castle, Kyoto' },
        { id: 'act-7', title: 'Nishiki Market', location: 'Nishiki Market, Kyoto' },
      ];

      prisma.itineraryDay.findMany.mockResolvedValue([
        {
          ...mockDay,
          activities: sevenStops.map((stop, idx) => ({
            ...mockActivity,
            id: stop.id,
            title: stop.title,
            location: stop.location,
            latitude: null,
            longitude: null,
            sortOrder: idx,
          })),
        },
      ]);

      const geocodingService = (service as any).geocodingService;
      sevenStops.forEach((_, idx) => {
        geocodingService.geocode.mockResolvedValueOnce([
          { latitude: 35.0 + idx * 0.01, longitude: 135.7 + idx * 0.01, displayName: `Stop ${idx}` },
        ]);
        prisma.activity.update.mockResolvedValueOnce({
          ...mockActivity,
          id: `act-${idx + 1}`,
          latitude: 35.0 + idx * 0.01,
          longitude: 135.7 + idx * 0.01,
        });
      });

      const result = await service.geocodeUnmappedActivities('user-1', 'trip-1');

      expect(result.totalAttempted).toBe(7);
      expect(result.resolvedCount).toBe(7);
      expect(result.unmappedCount).toBe(0);
      expect(result.activities).toHaveLength(7);
      expect(prisma.activity.update).toHaveBeenCalledTimes(7);
    });

    it('should correctly report partial success when some of the seven stops fail to geocode', async () => {
      const sevenStops = Array.from({ length: 7 }, (_, i) => ({
        id: `act-${i + 1}`,
        title: `Stop ${i + 1}`,
        location: `Location ${i + 1}`,
      }));

      prisma.itineraryDay.findMany.mockResolvedValue([
        {
          ...mockDay,
          activities: sevenStops.map((stop) => ({
            ...mockActivity,
            id: stop.id,
            title: stop.title,
            location: stop.location,
            latitude: null,
            longitude: null,
          })),
        },
      ]);

      const geocodingService = (service as any).geocodingService;
      // 4 succeed, 3 fail
      for (let i = 0; i < 7; i++) {
        if (i < 4) {
          geocodingService.geocode.mockResolvedValueOnce([
            { latitude: 35.0 + i * 0.01, longitude: 135.7 + i * 0.01, displayName: `Stop ${i}` },
          ]);
          prisma.activity.update.mockResolvedValueOnce({
            ...mockActivity,
            id: `act-${i + 1}`,
            latitude: 35.0 + i * 0.01,
            longitude: 135.7 + i * 0.01,
          });
        } else {
          geocodingService.geocode.mockResolvedValueOnce([]);
        }
      }

      const result = await service.geocodeUnmappedActivities('user-1', 'trip-1');

      expect(result.totalAttempted).toBe(7);
      expect(result.resolvedCount).toBe(4);
      expect(result.unmappedCount).toBe(3);
      expect(result.activities).toHaveLength(4);
      expect(prisma.activity.update).toHaveBeenCalledTimes(4);
    });

    it('should reject unauthorized users who do not have access to the trip', async () => {
      tripsService.validateTripAccess.mockRejectedValueOnce(
        new ForbiddenException('You do not have permission to access or modify this trip.'),
      );

      await expect(
        service.geocodeUnmappedActivities('unauthorized-user', 'trip-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle geocoding failures gracefully without throwing and leave failed activities unmapped', async () => {
      prisma.itineraryDay.findMany.mockResolvedValue([
        {
          ...mockDay,
          activities: [
            {
              ...mockActivity,
              id: 'act-unmapped-fail',
              title: 'Unknown Secret Spot',
              location: 'Nowhere',
              latitude: null,
              longitude: null,
            },
          ],
        },
      ]);

      const geocodingService = (service as any).geocodingService;
      geocodingService.geocode.mockRejectedValueOnce(new Error('Nominatim timeout'));

      const result = await service.geocodeUnmappedActivities('user-1', 'trip-1');

      expect(result.totalAttempted).toBe(1);
      expect(result.resolvedCount).toBe(0);
      expect(result.unmappedCount).toBe(1);
      expect(result.activities).toHaveLength(0);
      expect(prisma.activity.update).not.toHaveBeenCalled();
    });
  });
});
