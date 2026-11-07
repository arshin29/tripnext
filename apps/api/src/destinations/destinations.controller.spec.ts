import { Test, TestingModule } from '@nestjs/testing';
import { DestinationsController } from './destinations.controller';
import { DestinationsService } from './destinations.service';

describe('DestinationsController', () => {
  let controller: DestinationsController;
  let service: {
    findAll: jest.Mock;
    findBySlug: jest.Mock;
    findFeatured: jest.Mock;
    getCategories: jest.Mock;
  };

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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findFeatured: jest.fn(),
      getCategories: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DestinationsController],
      providers: [{ provide: DestinationsService, useValue: service }],
    }).compile();

    controller = module.get<DestinationsController>(DestinationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return paginated destinations from findAll', async () => {
    service.findAll.mockResolvedValue({
      items: [mockDestination],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
    });

    const res = await controller.findAll({});
    expect(res.success).toBe(true);
    expect(res.data?.items).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalledWith({});
  });

  it('should return destination by slug', async () => {
    service.findBySlug.mockResolvedValue(mockDestination);

    const res = await controller.findBySlug('kyoto-japan');
    expect(res.success).toBe(true);
    expect(res.data?.slug).toBe('kyoto-japan');
    expect(service.findBySlug).toHaveBeenCalledWith('kyoto-japan');
  });

  it('should return featured destinations', async () => {
    service.findFeatured.mockResolvedValue([mockDestination]);

    const res = await controller.findFeatured();
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(1);
  });

  it('should return categories with counts', async () => {
    service.getCategories.mockResolvedValue([{ name: 'Cultural', count: 5 }]);

    const res = await controller.getCategories();
    expect(res.success).toBe(true);
    expect(res.data).toEqual([{ name: 'Cultural', count: 5 }]);
  });
});
