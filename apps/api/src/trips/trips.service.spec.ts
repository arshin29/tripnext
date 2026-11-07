import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from './trips.service';

describe('TripsService', () => {
  let service: TripsService;
  let prisma: {
    trip: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    destination: {
      findUnique: jest.Mock;
    };
    itineraryDay: {
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockDate = new Date('2026-06-01T00:00:00.000Z');
  const mockEndDate = new Date('2026-06-05T00:00:00.000Z');

  const mockDestination = {
    id: 'dest-1',
    name: 'Kyoto Sanctuaries',
    slug: 'kyoto-japan',
    city: 'Kyoto',
    country: 'Japan',
    shortDescription: 'Ancient temples',
    detailedDescription: 'Full guide',
    category: 'Cultural',
    coverImage: 'https://images.unsplash.com/kyoto.jpg',
    galleryImages: [],
    attractions: ['Fushimi Inari'],
    bestTimeToVisit: 'Spring',
    approximateDuration: '5 Days',
    isFeatured: true,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockTrip = {
    id: 'trip-1',
    userId: 'user-1',
    destinationId: 'dest-1',
    title: 'Kyoto Summer Retreat',
    description: 'A quiet cultural escape',
    startDate: mockDate,
    endDate: mockEndDate,
    travelerCount: 2,
    budgetAmount: '150000',
    currency: 'INR',
    coverImage: 'https://images.unsplash.com/kyoto.jpg',
    status: 'UPCOMING',
    createdAt: mockDate,
    updatedAt: mockDate,
    destination: mockDestination,
    itineraryDays: [
      {
        id: 'day-1',
        tripId: 'trip-1',
        dayNumber: 1,
        date: mockDate,
        title: 'Day 1',
        notes: null,
        createdAt: mockDate,
        updatedAt: mockDate,
        activities: [
          {
            id: 'act-1',
            itineraryDayId: 'day-1',
            title: 'Arrive at Kansai Airport',
            description: null,
            location: 'Osaka',
            startTime: '10:00 AM',
            durationMinutes: 120,
            notes: null,
            sortOrder: 1,
            isCompleted: true,
            createdAt: mockDate,
            updatedAt: mockDate,
          },
        ],
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      trip: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      destination: {
        findUnique: jest.fn(),
      },
      itineraryDay: {
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [TripsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<TripsService>(TripsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTrip', () => {
    it('should throw NotFoundException if destination does not exist', async () => {
      prisma.destination.findUnique.mockResolvedValue(null);

      await expect(
        service.createTrip('user-1', {
          destinationId: 'nonexistent',
          title: 'Trip to Nowhere',
          startDate: '2026-06-01',
          endDate: '2026-06-05',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if endDate is before startDate', async () => {
      prisma.destination.findUnique.mockResolvedValue(mockDestination);

      await expect(
        service.createTrip('user-1', {
          destinationId: 'dest-1',
          title: 'Time Travel Trip',
          startDate: '2026-06-10',
          endDate: '2026-06-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create trip and generate day-by-day itinerary in a transaction', async () => {
      prisma.destination.findUnique.mockResolvedValue(mockDestination);
      prisma.trip.create.mockResolvedValue({ id: 'trip-1' });
      prisma.trip.findUniqueOrThrow.mockResolvedValue(mockTrip);

      const result = await service.createTrip('user-1', {
        destinationId: 'dest-1',
        title: 'Kyoto Summer Retreat',
        startDate: '2026-06-01',
        endDate: '2026-06-05',
        travelerCount: 2,
        budgetAmount: 150000,
        currency: 'INR',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.itineraryDay.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ tripId: 'trip-1', dayNumber: 1 }),
          expect.objectContaining({ tripId: 'trip-1', dayNumber: 5 }),
        ]),
      });
      expect(result.id).toBe('trip-1');
      expect(result.budgetAmount).toBe(150000);
      expect(result.activitiesCount).toBe(1);
      expect(result.completedActivitiesCount).toBe(1);
    });
  });

  describe('getUserTrips', () => {
    it('should return all trips for the authenticated user', async () => {
      prisma.trip.findMany.mockResolvedValue([mockTrip]);

      const trips = await service.getUserTrips('user-1');

      expect(trips).toHaveLength(1);
      expect(trips[0].title).toBe('Kyoto Summer Retreat');
      expect(prisma.trip.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { startDate: 'asc' },
        include: expect.any(Object),
      });
    });
  });

  describe('getTripById', () => {
    it('should return trip when owned by user', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);

      const trip = await service.getTripById('user-1', 'trip-1');

      expect(trip.id).toBe('trip-1');
      expect(trip.title).toBe('Kyoto Summer Retreat');
    });

    it('should throw NotFoundException when trip does not exist', async () => {
      prisma.trip.findUnique.mockResolvedValue(null);

      await expect(service.getTripById('user-1', 'unknown')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when trip belongs to another user', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip); // owned by user-1

      await expect(service.getTripById('user-2', 'trip-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('updateTrip', () => {
    it('should update trip fields when owned by user', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);
      prisma.trip.update.mockResolvedValue({
        ...mockTrip,
        title: 'Updated Kyoto Retreat',
      });

      const updated = await service.updateTrip('user-1', 'trip-1', {
        title: 'Updated Kyoto Retreat',
      });

      expect(updated.title).toBe('Updated Kyoto Retreat');
      expect(prisma.trip.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'trip-1' },
          data: expect.objectContaining({ title: 'Updated Kyoto Retreat' }),
        }),
      );
    });
  });

  describe('deleteTrip', () => {
    it('should delete trip when owned by user', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);
      prisma.trip.delete.mockResolvedValue(mockTrip);

      const result = await service.deleteTrip('user-1', 'trip-1');

      expect(result).toEqual({ success: true, tripId: 'trip-1' });
      expect(prisma.trip.delete).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
      });
    });
  });
});
