import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ItineraryService } from './itinerary.service';
import { TripsService } from './trips.service';

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
});
