import { Test, TestingModule } from '@nestjs/testing';
import { GeocodingController } from './geocoding.controller';
import { GeocodingService } from './geocoding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('GeocodingController', () => {
  let controller: GeocodingController;
  let service: GeocodingService;

  const mockGeocodingService = {
    geocode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeocodingController],
      providers: [
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GeocodingController>(GeocodingController);
    service = module.get<GeocodingService>(GeocodingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return ApiResponse with geocoded results', async () => {
    mockGeocodingService.geocode.mockResolvedValue([
      {
        latitude: 48.8566,
        longitude: 2.3522,
        displayName: 'Paris, France',
      },
    ]);

    const response = await controller.search({
      q: 'Paris',
      contextHint: 'France',
    });

    expect(response.success).toBe(true);
    expect(response.data).toHaveLength(1);
    expect(response.data![0].displayName).toBe('Paris, France');
    expect(service.geocode).toHaveBeenCalledWith('Paris', 'France');
  });
});
