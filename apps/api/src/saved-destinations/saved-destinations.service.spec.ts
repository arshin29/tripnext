import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { SavedDestinationsService } from './saved-destinations.service';

describe('SavedDestinationsService', () => {
  let service: SavedDestinationsService;
  let prisma: {
    destination: {
      findUnique: jest.Mock;
    };
    savedDestination: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockDestination = {
    id: 'dest-1',
    name: 'Kyoto Sanctuaries',
    slug: 'kyoto-japan',
    city: 'Kyoto',
    country: 'Japan',
    shortDescription: 'Ancient wooden temples.',
    detailedDescription: 'Kyoto is full of rich history.',
    category: 'Cultural',
    coverImage: 'https://images.unsplash.com/photo-1',
    galleryImages: [],
    attractions: ['Fushimi Inari'],
    bestTimeToVisit: 'Spring',
    approximateDuration: '5 Days',
    isFeatured: true,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockSavedDestination = {
    id: 'saved-1',
    userId: 'user-1',
    destinationId: 'dest-1',
    createdAt: mockDate,
    destination: mockDestination,
  };

  beforeEach(async () => {
    prisma = {
      destination: {
        findUnique: jest.fn(),
      },
      savedDestination: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SavedDestinationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SavedDestinationsService>(SavedDestinationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserSaved', () => {
    it('should return all saved destinations for the specified user', async () => {
      prisma.savedDestination.findMany.mockResolvedValue([mockSavedDestination]);

      const result = await service.getUserSaved('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].destination.id).toBe('dest-1');
      expect(result[0].createdAt).toBe(mockDate.toISOString());
      expect(prisma.savedDestination.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { destination: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('save', () => {
    it('should throw NotFoundException if destination does not exist', async () => {
      prisma.destination.findUnique.mockResolvedValue(null);

      await expect(service.save('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return existing record if already saved (idempotent)', async () => {
      prisma.destination.findUnique.mockResolvedValue(mockDestination);
      prisma.savedDestination.findUnique.mockResolvedValue(mockSavedDestination);

      const result = await service.save('user-1', 'dest-1');

      expect(result.id).toBe('saved-1');
      expect(prisma.savedDestination.create).not.toHaveBeenCalled();
    });

    it('should create new saved destination record if not previously saved', async () => {
      prisma.destination.findUnique.mockResolvedValue(mockDestination);
      prisma.savedDestination.findUnique.mockResolvedValue(null);
      prisma.savedDestination.create.mockResolvedValue(mockSavedDestination);

      const result = await service.save('user-1', 'dest-1');

      expect(result.id).toBe('saved-1');
      expect(prisma.savedDestination.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          destinationId: 'dest-1',
        },
        include: { destination: true },
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if item was not saved', async () => {
      prisma.savedDestination.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'dest-1')).rejects.toThrow(NotFoundException);
    });

    it('should delete saved destination when found', async () => {
      prisma.savedDestination.findUnique.mockResolvedValue(mockSavedDestination);
      prisma.savedDestination.delete.mockResolvedValue(mockSavedDestination);

      const result = await service.remove('user-1', 'dest-1');

      expect(result).toEqual({ success: true, destinationId: 'dest-1' });
      expect(prisma.savedDestination.delete).toHaveBeenCalledWith({
        where: {
          userId_destinationId: {
            userId: 'user-1',
            destinationId: 'dest-1',
          },
        },
      });
    });
  });
});
