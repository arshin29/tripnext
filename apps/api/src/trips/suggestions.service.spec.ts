import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationService } from './collaboration.service';
import { SuggestionsService } from './suggestions.service';

describe('SuggestionsService', () => {
  let service: SuggestionsService;
  let prisma: any;
  let collaborationService: any;

  const mockDate = new Date();

  const mockUser = {
    id: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockSuggestion = {
    id: 'sug-1',
    tripId: 'trip-1',
    itineraryDayId: 'day-1',
    suggestedById: 'user-1',
    title: 'Visit Bamboo Grove',
    description: 'Early morning walk',
    location: 'Arashiyama',
    startTime: '08:00',
    durationMinutes: 90,
    status: 'PENDING',
    createdAt: mockDate,
    updatedAt: mockDate,
    suggestedBy: mockUser,
    votes: [],
  };

  beforeEach(async () => {
    prisma = {
      itineraryDay: {
        findFirst: jest.fn(),
      },
      activitySuggestion: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      suggestionVote: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      activity: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    collaborationService = {
      validateTripAccess: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      validateTripOwner: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CollaborationService, useValue: collaborationService },
      ],
    }).compile();

    service = module.get<SuggestionsService>(SuggestionsService);
  });

  describe('createSuggestion', () => {
    it('should create suggestion for a valid day in the trip', async () => {
      prisma.itineraryDay.findFirst.mockResolvedValue({ id: 'day-1', tripId: 'trip-1' });
      prisma.activitySuggestion.create.mockResolvedValue({
        ...mockSuggestion,
        votes: [],
      });

      const result = await service.createSuggestion('user-1', 'trip-1', {
        itineraryDayId: 'day-1',
        title: 'Visit Bamboo Grove',
        location: 'Arashiyama',
        startTime: '08:00',
        durationMinutes: 90,
      });

      expect(result.id).toBe('sug-1');
      expect(result.title).toBe('Visit Bamboo Grove');
      expect(result.voteCount).toBe(0);
      expect(result.hasVoted).toBe(false);
    });

    it('should reject suggestion if itineraryDay does not belong to trip', async () => {
      prisma.itineraryDay.findFirst.mockResolvedValue(null);

      await expect(
        service.createSuggestion('user-1', 'trip-1', {
          itineraryDayId: 'day-999',
          title: 'Invalid',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('voting', () => {
    it('should record vote for member', async () => {
      prisma.activitySuggestion.findFirst.mockResolvedValue(mockSuggestion);
      prisma.suggestionVote.findUnique.mockResolvedValue(null);
      prisma.suggestionVote.create.mockResolvedValue({ id: 'v-1' });
      prisma.activitySuggestion.findUniqueOrThrow.mockResolvedValue({
        ...mockSuggestion,
        votes: [{ id: 'v-1', userId: 'user-1', user: mockUser }],
      });

      const result = await service.voteSuggestion('user-1', 'trip-1', 'sug-1');
      expect(result.voteCount).toBe(1);
      expect(result.hasVoted).toBe(true);
    });

    it('should prevent duplicate votes from the same user', async () => {
      prisma.activitySuggestion.findFirst.mockResolvedValue(mockSuggestion);
      prisma.suggestionVote.findUnique.mockResolvedValue({ id: 'v-existing' });

      await expect(service.voteSuggestion('user-1', 'trip-1', 'sug-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow user to remove their vote', async () => {
      prisma.activitySuggestion.findFirst.mockResolvedValue(mockSuggestion);
      prisma.suggestionVote.findUnique.mockResolvedValue({ id: 'v-existing' });
      prisma.suggestionVote.delete.mockResolvedValue({ id: 'v-existing' });
      prisma.activitySuggestion.findUniqueOrThrow.mockResolvedValue({
        ...mockSuggestion,
        votes: [],
      });

      const result = await service.removeVote('user-1', 'trip-1', 'sug-1');
      expect(result.voteCount).toBe(0);
      expect(result.hasVoted).toBe(false);
    });
  });

  describe('approval workflow', () => {
    it('should allow owner to approve suggestion and add it to itinerary activities', async () => {
      prisma.activitySuggestion.findFirst.mockResolvedValue(mockSuggestion);
      prisma.activity.findFirst.mockResolvedValue({ sortOrder: 2 });
      prisma.activity.create.mockResolvedValue({ id: 'act-new' });
      prisma.activitySuggestion.update.mockResolvedValue({
        ...mockSuggestion,
        status: 'APPROVED',
      });
      prisma.activitySuggestion.findUniqueOrThrow.mockResolvedValue({
        ...mockSuggestion,
        status: 'APPROVED',
        votes: [],
      });

      const result = await service.updateSuggestionStatus('owner-1', 'trip-1', 'sug-1', {
        status: 'APPROVED',
      });

      expect(result.status).toBe('APPROVED');
      expect(prisma.activity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          itineraryDayId: 'day-1',
          title: 'Visit Bamboo Grove',
          sortOrder: 3,
          isCompleted: false,
        }),
      });
    });

    it('should reject approval if user is not owner', async () => {
      collaborationService.validateTripOwner.mockRejectedValue(
        new ForbiddenException('Only the trip owner can perform this action.'),
      );

      await expect(
        service.updateSuggestionStatus('member-1', 'trip-1', 'sug-1', {
          status: 'APPROVED',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
