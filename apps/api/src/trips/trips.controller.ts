import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  Activity,
  ActivitySuggestion,
  ActivitySuggestionStatus,
  ApiResponse,
  Expense,
  GroupBalancesSummary,
  ItineraryDay,
  Trip,
  TripInvitation,
  TripMember,
  TripStatus,
} from '@tripnest/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';
import {
  CreateActivityDto,
  CreateExpenseDto,
  CreateInvitationDto,
  CreateItineraryDayDto,
  CreateSuggestionDto,
  CreateTripDto,
  ReorderActivitiesDto,
  UpdateActivityDto,
  UpdateExpenseDto,
  UpdateItineraryDayDto,
  UpdateSuggestionStatusDto,
  UpdateTripDto,
} from './dto';
import { ExpensesService } from './expenses.service';
import { ItineraryService } from './itinerary.service';
import { SuggestionsService } from './suggestions.service';
import { TripsService } from './trips.service';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly itineraryService: ItineraryService,
    private readonly collaborationService: CollaborationService,
    private readonly suggestionsService: SuggestionsService,
    private readonly expensesService: ExpensesService,
  ) {}

  // =========================================================================
  // TRIP CRUD & LISTING ENDPOINTS
  // =========================================================================

  /**
   * Create a new trip with auto-generated itinerary days and initial owner membership.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTrip(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTripDto,
  ): Promise<ApiResponse<Trip>> {
    const data = await this.tripsService.createTrip(userId, dto);
    return {
      success: true,
      message: 'Trip created successfully with day-by-day itinerary canvas.',
      data,
    };
  }

  /**
   * List all trips owned by the authenticated user with optional status filter.
   */
  @Get()
  async getUserTrips(
    @CurrentUser('id') userId: string,
    @Query('status') status?: TripStatus,
  ): Promise<ApiResponse<Trip[]>> {
    const data = await this.tripsService.getUserTrips(userId, status);
    return {
      success: true,
      data,
    };
  }

  /**
   * List trips shared with the authenticated user where they are a MEMBER.
   * NOTE: Placed above ':id' to prevent route collision.
   */
  @Get('shared')
  async getSharedTrips(@CurrentUser('id') userId: string): Promise<ApiResponse<Trip[]>> {
    const data = await this.tripsService.getSharedTrips(userId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Get detailed trip information by ID (Accessible by OWNER or MEMBER).
   */
  @Get(':id')
  async getTripById(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
  ): Promise<ApiResponse<Trip>> {
    const data = await this.tripsService.getTripById(userId, tripId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Update trip details (Owner only).
   */
  @Patch(':id')
  async updateTrip(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Body() dto: UpdateTripDto,
  ): Promise<ApiResponse<Trip>> {
    const data = await this.tripsService.updateTrip(userId, tripId, dto);
    return {
      success: true,
      message: 'Trip updated successfully.',
      data,
    };
  }

  /**
   * Delete a trip with all its itinerary days and activities (Owner only).
   */
  @Delete(':id')
  async deleteTrip(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
  ): Promise<ApiResponse<{ success: boolean; tripId: string }>> {
    const data = await this.tripsService.deleteTrip(userId, tripId);
    return {
      success: true,
      message: 'Trip deleted successfully.',
      data,
    };
  }

  // =========================================================================
  // ITINERARY DAY ENDPOINTS
  // =========================================================================

  /**
   * Get full itinerary grouped by day for a trip (Owner or Member).
   */
  @Get(':id/itinerary')
  async getItinerary(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
  ): Promise<ApiResponse<ItineraryDay[]>> {
    const data = await this.itineraryService.getItinerary(userId, tripId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Add an itinerary day to a trip (Owner only).
   */
  @Post(':id/itinerary/days')
  @HttpCode(HttpStatus.CREATED)
  async createDay(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Body() dto: CreateItineraryDayDto,
  ): Promise<ApiResponse<ItineraryDay>> {
    const data = await this.itineraryService.createDay(userId, tripId, dto);
    return {
      success: true,
      message: 'Itinerary day added successfully.',
      data,
    };
  }

  /**
   * Update day title or notes (Owner only).
   */
  @Patch(':id/itinerary/days/:dayId')
  async updateDay(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('dayId') dayId: string,
    @Body() dto: UpdateItineraryDayDto,
  ): Promise<ApiResponse<ItineraryDay>> {
    const data = await this.itineraryService.updateDay(userId, tripId, dayId, dto);
    return {
      success: true,
      message: 'Day details updated.',
      data,
    };
  }

  /**
   * Delete an itinerary day (Owner only).
   */
  @Delete(':id/itinerary/days/:dayId')
  async deleteDay(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('dayId') dayId: string,
  ): Promise<ApiResponse<{ success: boolean; dayId: string }>> {
    const data = await this.itineraryService.deleteDay(userId, tripId, dayId);
    return {
      success: true,
      message: 'Itinerary day deleted.',
      data,
    };
  }

  // =========================================================================
  // ACTIVITY ENDPOINTS
  // =========================================================================

  /**
   * Add a new activity to an itinerary day (Owner or Member).
   */
  @Post(':id/activities')
  @HttpCode(HttpStatus.CREATED)
  async createActivity(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Body() dto: CreateActivityDto,
  ): Promise<ApiResponse<Activity>> {
    const data = await this.itineraryService.createActivity(userId, tripId, dto);
    return {
      success: true,
      message: 'Activity added to itinerary.',
      data,
    };
  }

  /**
   * Reorder activities within an itinerary day.
   */
  @Patch(':id/activities/reorder')
  async reorderActivities(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Body() dto: ReorderActivitiesDto,
  ): Promise<ApiResponse<Activity[]>> {
    const data = await this.itineraryService.reorderActivities(userId, tripId, dto);
    return {
      success: true,
      message: 'Activities reordered successfully.',
      data,
    };
  }

  /**
   * Toggle activity completed status.
   */
  @Patch(':id/activities/:activityId/complete')
  async toggleComplete(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('activityId') activityId: string,
  ): Promise<ApiResponse<Activity>> {
    const data = await this.itineraryService.toggleComplete(userId, tripId, activityId);
    return {
      success: true,
      message: data.isCompleted
        ? 'Activity marked as completed.'
        : 'Activity marked as pending.',
      data,
    };
  }

  /**
   * Update an existing activity.
   */
  @Patch(':id/activities/:activityId')
  async updateActivity(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('activityId') activityId: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<ApiResponse<Activity>> {
    const data = await this.itineraryService.updateActivity(
      userId,
      tripId,
      activityId,
      dto,
    );
    return {
      success: true,
      message: 'Activity updated.',
      data,
    };
  }

  /**
   * Delete an activity from an itinerary day.
   */
  @Delete(':id/activities/:activityId')
  async deleteActivity(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('activityId') activityId: string,
  ): Promise<ApiResponse<{ success: boolean; activityId: string }>> {
    const data = await this.itineraryService.deleteActivity(userId, tripId, activityId);
    return {
      success: true,
      message: 'Activity deleted from itinerary.',
      data,
    };
  }

  // =========================================================================
  // TRIP MEMBERS & INVITATIONS ENDPOINTS
  // =========================================================================

  /**
   * List all members of a trip.
   */
  @Get(':id/members')
  async getTripMembers(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
  ): Promise<ApiResponse<TripMember[]>> {
    const data = await this.collaborationService.getTripMembers(userId, tripId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Remove a member from a trip (Owner only).
   */
  @Delete(':id/members/:memberId')
  async removeMember(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('memberId') memberId: string,
  ): Promise<ApiResponse<{ success: boolean; memberId: string }>> {
    const data = await this.collaborationService.removeMember(userId, tripId, memberId);
    return {
      success: true,
      message: 'Member removed from trip.',
      data,
    };
  }

  /**
   * Create a secure invitation for an email address (Owner only).
   */
  @Post(':id/invitations')
  @HttpCode(HttpStatus.CREATED)
  async createInvitation(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Body() dto: CreateInvitationDto,
  ): Promise<ApiResponse<TripInvitation>> {
    const data = await this.collaborationService.createInvitation(userId, tripId, dto);
    return {
      success: true,
      message: 'Invitation link generated successfully.',
      data,
    };
  }

  /**
   * Get pending invitations for a trip (Owner only).
   */
  @Get(':id/invitations')
  async getTripInvitations(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
  ): Promise<ApiResponse<TripInvitation[]>> {
    const data = await this.collaborationService.getTripInvitations(userId, tripId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Revoke an active invitation (Owner only).
   */
  @Delete(':id/invitations/:invitationId')
  async revokeInvitation(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('invitationId') invitationId: string,
  ): Promise<ApiResponse<{ success: boolean; invitationId: string }>> {
    const data = await this.collaborationService.revokeInvitation(
      userId,
      tripId,
      invitationId,
    );
    return {
      success: true,
      message: 'Invitation revoked.',
      data,
    };
  }

  // =========================================================================
  // ACTIVITY SUGGESTIONS & VOTING ENDPOINTS
  // =========================================================================

  /**
   * Suggest an activity for an itinerary day.
   */
  @Post(':id/suggestions')
  @HttpCode(HttpStatus.CREATED)
  async createSuggestion(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Body() dto: CreateSuggestionDto,
  ): Promise<ApiResponse<ActivitySuggestion>> {
    const data = await this.suggestionsService.createSuggestion(userId, tripId, dto);
    return {
      success: true,
      message: 'Activity suggested for companion voting.',
      data,
    };
  }

  /**
   * List suggestions for a trip.
   */
  @Get(':id/suggestions')
  async getSuggestions(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Query('dayId') dayId?: string,
    @Query('status') status?: ActivitySuggestionStatus,
  ): Promise<ApiResponse<ActivitySuggestion[]>> {
    const data = await this.suggestionsService.getSuggestions(
      userId,
      tripId,
      dayId,
      status,
    );
    return {
      success: true,
      data,
    };
  }

  /**
   * Cast a vote for a suggestion.
   */
  @Post(':id/suggestions/:suggestionId/vote')
  @HttpCode(HttpStatus.OK)
  async voteSuggestion(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('suggestionId') suggestionId: string,
  ): Promise<ApiResponse<ActivitySuggestion>> {
    const data = await this.suggestionsService.voteSuggestion(
      userId,
      tripId,
      suggestionId,
    );
    return {
      success: true,
      message: 'Vote recorded.',
      data,
    };
  }

  /**
   * Remove a vote from a suggestion.
   */
  @Delete(':id/suggestions/:suggestionId/vote')
  async removeVote(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('suggestionId') suggestionId: string,
  ): Promise<ApiResponse<ActivitySuggestion>> {
    const data = await this.suggestionsService.removeVote(userId, tripId, suggestionId);
    return {
      success: true,
      message: 'Vote removed.',
      data,
    };
  }

  /**
   * Approve or reject a suggestion (Owner only).
   */
  @Patch(':id/suggestions/:suggestionId/status')
  async updateSuggestionStatus(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('suggestionId') suggestionId: string,
    @Body() dto: UpdateSuggestionStatusDto,
  ): Promise<ApiResponse<ActivitySuggestion>> {
    const data = await this.suggestionsService.updateSuggestionStatus(
      userId,
      tripId,
      suggestionId,
      dto,
    );
    return {
      success: true,
      message:
        dto.status === 'APPROVED'
          ? 'Suggestion approved and added to confirmed itinerary.'
          : 'Suggestion rejected.',
      data,
    };
  }

  // =========================================================================
  // SHARED EXPENSES & BALANCES ENDPOINTS
  // =========================================================================

  /**
   * Record a new shared expense with equal or custom split.
   */
  @Post(':id/expenses')
  @HttpCode(HttpStatus.CREATED)
  async createExpense(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Body() dto: CreateExpenseDto,
  ): Promise<ApiResponse<Expense>> {
    const data = await this.expensesService.createExpense(userId, tripId, dto);
    return {
      success: true,
      message: 'Expense recorded successfully.',
      data,
    };
  }

  /**
   * List all expenses for a trip.
   */
  @Get(':id/expenses')
  async getTripExpenses(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
  ): Promise<ApiResponse<Expense[]>> {
    const data = await this.expensesService.getTripExpenses(userId, tripId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Get group balances, net positions, and simplified settlement suggestions.
   * NOTE: Placed above ':id/expenses/:expenseId' to avoid parameter collisions.
   */
  @Get(':id/expenses/balances')
  async getGroupBalances(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
  ): Promise<ApiResponse<GroupBalancesSummary>> {
    const data = await this.expensesService.getGroupBalances(userId, tripId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Get a single expense by ID.
   */
  @Get(':id/expenses/:expenseId')
  async getExpenseById(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<ApiResponse<Expense>> {
    const data = await this.expensesService.getExpenseById(userId, tripId, expenseId);
    return {
      success: true,
      data,
    };
  }

  /**
   * Update an existing expense (Owner or expense creator only).
   */
  @Patch(':id/expenses/:expenseId')
  async updateExpense(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ): Promise<ApiResponse<Expense>> {
    const data = await this.expensesService.updateExpense(userId, tripId, expenseId, dto);
    return {
      success: true,
      message: 'Expense updated.',
      data,
    };
  }

  /**
   * Delete an expense (Owner or expense creator only).
   */
  @Delete(':id/expenses/:expenseId')
  async deleteExpense(
    @CurrentUser('id') userId: string,
    @Param('id') tripId: string,
    @Param('expenseId') expenseId: string,
  ): Promise<ApiResponse<{ success: boolean; expenseId: string }>> {
    const data = await this.expensesService.deleteExpense(userId, tripId, expenseId);
    return {
      success: true,
      message: 'Expense deleted.',
      data,
    };
  }
}
