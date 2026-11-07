import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';
import { ExpensesService } from './expenses.service';
import { ItineraryService } from './itinerary.service';
import { SuggestionsService } from './suggestions.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

describe('TripsController', () => {
  let controller: TripsController;
  let tripsService: any;
  let itineraryService: any;
  let collaborationService: any;
  let suggestionsService: any;
  let expensesService: any;

  const mockTrip = {
    id: 'trip-1',
    userId: 'user-1',
    destinationId: 'dest-1',
    title: 'Kyoto Journey',
    startDate: '2026-06-01T00:00:00.000Z',
    endDate: '2026-06-05T00:00:00.000Z',
    travelerCount: 2,
    budgetAmount: 100000,
    currency: 'INR',
    coverImage: 'https://images.unsplash.com/kyoto.jpg',
    status: 'UPCOMING',
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
  };

  beforeEach(async () => {
    tripsService = {
      createTrip: jest.fn().mockResolvedValue(mockTrip),
      getUserTrips: jest.fn().mockResolvedValue([mockTrip]),
      getSharedTrips: jest.fn().mockResolvedValue([]),
      getTripById: jest.fn().mockResolvedValue(mockTrip),
      updateTrip: jest.fn().mockResolvedValue(mockTrip),
      deleteTrip: jest.fn().mockResolvedValue({ success: true, tripId: 'trip-1' }),
    };

    itineraryService = {
      getItinerary: jest.fn().mockResolvedValue([]),
      createDay: jest.fn().mockResolvedValue({ id: 'day-1', dayNumber: 1 }),
      updateDay: jest.fn().mockResolvedValue({ id: 'day-1', title: 'Updated' }),
      deleteDay: jest.fn().mockResolvedValue({ success: true, dayId: 'day-1' }),
      createActivity: jest.fn().mockResolvedValue({ id: 'act-1', title: 'Activity' }),
      updateActivity: jest.fn().mockResolvedValue({ id: 'act-1', title: 'Updated Act' }),
      deleteActivity: jest.fn().mockResolvedValue({ success: true, activityId: 'act-1' }),
      toggleComplete: jest.fn().mockResolvedValue({ id: 'act-1', isCompleted: true }),
      reorderActivities: jest.fn().mockResolvedValue([]),
    };

    collaborationService = {
      getTripMembers: jest.fn().mockResolvedValue([]),
      removeMember: jest.fn().mockResolvedValue({ success: true, memberId: 'm-1' }),
      createInvitation: jest.fn().mockResolvedValue({ id: 'inv-1' }),
      getTripInvitations: jest.fn().mockResolvedValue([]),
      revokeInvitation: jest
        .fn()
        .mockResolvedValue({ success: true, invitationId: 'inv-1' }),
    };

    suggestionsService = {
      createSuggestion: jest.fn().mockResolvedValue({ id: 'sug-1' }),
      getSuggestions: jest.fn().mockResolvedValue([]),
      voteSuggestion: jest.fn().mockResolvedValue({ id: 'sug-1', voteCount: 1 }),
      removeVote: jest.fn().mockResolvedValue({ id: 'sug-1', voteCount: 0 }),
      updateSuggestionStatus: jest
        .fn()
        .mockResolvedValue({ id: 'sug-1', status: 'APPROVED' }),
    };

    expensesService = {
      createExpense: jest.fn().mockResolvedValue({ id: 'exp-1' }),
      getTripExpenses: jest.fn().mockResolvedValue([]),
      getGroupBalances: jest
        .fn()
        .mockResolvedValue({ totalTripExpenses: 0, members: [] }),
      getExpenseById: jest.fn().mockResolvedValue({ id: 'exp-1' }),
      updateExpense: jest.fn().mockResolvedValue({ id: 'exp-1' }),
      deleteExpense: jest.fn().mockResolvedValue({ success: true, expenseId: 'exp-1' }),
      getUserExpensesOverview: jest.fn().mockResolvedValue({ totalLogged: 0, trips: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TripsController],
      providers: [
        { provide: TripsService, useValue: tripsService },
        { provide: ItineraryService, useValue: itineraryService },
        { provide: CollaborationService, useValue: collaborationService },
        { provide: SuggestionsService, useValue: suggestionsService },
        { provide: ExpensesService, useValue: expensesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TripsController>(TripsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create a trip', async () => {
    const result = await controller.createTrip('user-1', {
      destinationId: 'dest-1',
      title: 'Kyoto Journey',
      startDate: '2026-06-01',
      endDate: '2026-06-05',
    });

    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('trip-1');
  });

  it('should return user trips', async () => {
    const result = await controller.getUserTrips('user-1');
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it('should return trip by ID', async () => {
    const result = await controller.getTripById('user-1', 'trip-1');
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('trip-1');
  });

  it('should delete trip', async () => {
    const result = await controller.deleteTrip('user-1', 'trip-1');
    expect(result.success).toBe(true);
  });

  it('should toggle activity complete status', async () => {
    const result = await controller.toggleComplete('user-1', 'trip-1', 'act-1');
    expect(result.success).toBe(true);
    expect(result.data?.isCompleted).toBe(true);
  });
});
