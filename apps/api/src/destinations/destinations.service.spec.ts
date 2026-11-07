import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DestinationsService } from './destinations.service';

describe('DestinationsService', () => {
  let service: DestinationsService;
  let prisma: {
    destination: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
    };
  };

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockDestination = {
    id: 'dest-1',
    name: 'Kyoto Sanctuaries',
    slug: 'kyoto-japan',
    city: 'Kyoto',
    country: 'Japan',
    shortDescription: 'Ancient wooden temples and serene gardens.',
    detailedDescription:
      'Kyoto is the cultural heart of Japan with thousands of historic temples.',
    category: 'Cultural',
    coverImage: 'https://images.unsplash.com/photo-1',
    galleryImages: ['https://images.unsplash.com/photo-2'],
    attractions: ['Fushimi Inari', 'Kiyomizu-dera'],
    bestTimeToVisit: 'Spring & Autumn',
    approximateDuration: '5-7 Days',
    isFeatured: true,
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    prisma = {
      destination: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [DestinationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<DestinationsService>(DestinationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated destinations with default parameters', async () => {
      prisma.destination.findMany.mockResolvedValue([mockDestination]);
      prisma.destination.count.mockResolvedValue(1);

      const result = await service.findAll({});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(12);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].slug).toBe('kyoto-japan');
      expect(result.items[0].createdAt).toBe(mockDate.toISOString());
    });

    it('should apply search filters across name, city, country, shortDescription, and category', async () => {
      prisma.destination.findMany.mockResolvedValue([mockDestination]);
      prisma.destination.count.mockResolvedValue(1);

      await service.findAll({ search: 'Kyoto', category: 'Cultural', featured: true });

      expect(prisma.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            category: { equals: 'Cultural', mode: 'insensitive' },
            isFeatured: true,
          }),
        }),
      );
    });
  });

  describe('findBySlug', () => {
    it('should return destination when slug exists', async () => {
      prisma.destination.findUnique.mockResolvedValue(mockDestination);

      const result = await service.findBySlug('kyoto-japan');

      expect(result.slug).toBe('kyoto-japan');
      expect(prisma.destination.findUnique).toHaveBeenCalledWith({
        where: { slug: 'kyoto-japan' },
      });
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      prisma.destination.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('unknown-slug')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findFeatured', () => {
    it('should retrieve featured destinations limited by count', async () => {
      prisma.destination.findMany.mockResolvedValue([mockDestination]);

      const result = await service.findFeatured(6);

      expect(result).toHaveLength(1);
      expect(prisma.destination.findMany).toHaveBeenCalledWith({
        where: { isFeatured: true },
        take: 6,
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getCategories', () => {
    it('should return aggregated category counts', async () => {
      prisma.destination.groupBy.mockResolvedValue([
        { category: 'Alpine', _count: { category: 4 } },
        { category: 'Cultural', _count: { category: 5 } },
      ]);

      const result = await service.getCategories();

      expect(result).toEqual([
        { name: 'Alpine', count: 4 },
        { name: 'Cultural', count: 5 },
      ]);
    });
  });
});
