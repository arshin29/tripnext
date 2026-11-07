import { Test, TestingModule } from '@nestjs/testing';
import { SafeUser } from '@tripnest/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

describe('AiController', () => {
  let controller: AiController;
  let aiService: any;

  const mockUser: SafeUser = {
    id: 'user-1',
    name: 'Test Traveler',
    email: 'traveler@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    aiService = {
      generateSuggestions: jest.fn().mockResolvedValue({
        tripId: 'trip-1',
        destinationName: 'Paris',
        source: 'CURATED_FALLBACK',
        suggestions: [],
        disclaimer: 'Disclaimer text',
      }),
      importProposals: jest.fn().mockResolvedValue({
        importedCount: 2,
        skippedCount: 1,
        importedActivities: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [{ provide: AiService, useValue: aiService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return wrapped response for suggestions', async () => {
    const res = await controller.getSuggestions(mockUser, 'trip-1', {
      pace: 'BALANCED',
    });
    expect(res.success).toBe(true);
    expect(res.data?.destinationName).toBe('Paris');
    expect(aiService.generateSuggestions).toHaveBeenCalledWith(
      'user-1',
      'trip-1',
      { pace: 'BALANCED' },
    );
  });

  it('should return wrapped response for import', async () => {
    const res = await controller.importProposals(mockUser, 'trip-1', {
      proposals: [
        {
          itineraryDayId: 'day-1',
          title: 'Eiffel Tower',
        },
      ],
    });
    expect(res.success).toBe(true);
    expect(res.data?.importedCount).toBe(2);
    expect(res.data?.skippedCount).toBe(1);
    expect(res.message).toContain('2 activity proposal(s)');
    expect(res.message).toContain('1 duplicate(s) skipped');
  });
});
