import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivitySuggestion, ActivitySuggestionStatus, SafeUser } from '@tripnest/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationService } from './collaboration.service';
import { CreateSuggestionDto, UpdateSuggestionStatusDto } from './dto';

@Injectable()
export class SuggestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collaborationService: CollaborationService,
  ) {}

  private toSafeUser(user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Format suggestion record into shared interface.
   */
  private formatSuggestion(record: any, currentUserId: string): ActivitySuggestion {
    const votes = record.votes || [];
    const hasVoted = votes.some((v: any) => v.userId === currentUserId);
    const voters = votes.map((v: any) => this.toSafeUser(v.user));

    return {
      id: record.id,
      tripId: record.tripId,
      itineraryDayId: record.itineraryDayId,
      suggestedById: record.suggestedById,
      title: record.title,
      description: record.description,
      location: record.location,
      latitude: record.latitude,
      longitude: record.longitude,
      startTime: record.startTime,
      durationMinutes: record.durationMinutes,
      status: record.status as ActivitySuggestionStatus,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      suggestedBy: this.toSafeUser(record.suggestedBy),
      voteCount: votes.length,
      hasVoted,
      voters,
    };
  }

  /**
   * Create an activity suggestion for an itinerary day within the trip.
   */
  async createSuggestion(
    userId: string,
    tripId: string,
    dto: CreateSuggestionDto,
  ): Promise<ActivitySuggestion> {
    await this.collaborationService.validateTripAccess(userId, tripId);

    // Verify itinerary day belongs to this trip
    const day = await this.prisma.itineraryDay.findFirst({
      where: { id: dto.itineraryDayId, tripId },
    });

    if (!day) {
      throw new NotFoundException(
        `Itinerary day with ID '${dto.itineraryDayId}' was not found in this trip.`,
      );
    }

    // Validate coordinate pair
    if (
      (dto.latitude !== undefined && dto.longitude === undefined) ||
      (dto.latitude === undefined && dto.longitude !== undefined)
    ) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together as a coordinate pair.',
      );
    }

    const created = await this.prisma.activitySuggestion.create({
      data: {
        tripId,
        itineraryDayId: dto.itineraryDayId,
        suggestedById: userId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        location: dto.location?.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        startTime: dto.startTime?.trim(),
        durationMinutes: dto.durationMinutes,
        status: 'PENDING',
      },
      include: {
        suggestedBy: true,
        votes: {
          include: { user: true },
        },
      },
    });

    return this.formatSuggestion(created, userId);
  }

  /**
   * List all activity suggestions for a trip (optionally filtered by day or status).
   */
  async getSuggestions(
    userId: string,
    tripId: string,
    itineraryDayId?: string,
    status?: ActivitySuggestionStatus,
  ): Promise<ActivitySuggestion[]> {
    await this.collaborationService.validateTripAccess(userId, tripId);

    const where: any = { tripId };
    if (itineraryDayId) {
      where.itineraryDayId = itineraryDayId;
    }
    if (status) {
      where.status = status;
    }

    const records = await this.prisma.activitySuggestion.findMany({
      where,
      include: {
        suggestedBy: true,
        votes: {
          include: { user: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map((r) => this.formatSuggestion(r, userId));
  }

  /**
   * Cast a vote for a suggestion.
   */
  async voteSuggestion(
    userId: string,
    tripId: string,
    suggestionId: string,
  ): Promise<ActivitySuggestion> {
    await this.collaborationService.validateTripAccess(userId, tripId);

    const suggestion = await this.prisma.activitySuggestion.findFirst({
      where: { id: suggestionId, tripId },
    });

    if (!suggestion) {
      throw new NotFoundException(`Suggestion with ID '${suggestionId}' was not found.`);
    }

    // Check if user already voted
    const existingVote = await this.prisma.suggestionVote.findUnique({
      where: {
        suggestionId_userId: {
          suggestionId,
          userId,
        },
      },
    });

    if (existingVote) {
      throw new ConflictException('You have already voted for this suggestion.');
    }

    await this.prisma.suggestionVote.create({
      data: {
        suggestionId,
        userId,
      },
    });

    const updated = await this.prisma.activitySuggestion.findUniqueOrThrow({
      where: { id: suggestionId },
      include: {
        suggestedBy: true,
        votes: {
          include: { user: true },
        },
      },
    });

    return this.formatSuggestion(updated, userId);
  }

  /**
   * Remove a vote from a suggestion.
   */
  async removeVote(
    userId: string,
    tripId: string,
    suggestionId: string,
  ): Promise<ActivitySuggestion> {
    await this.collaborationService.validateTripAccess(userId, tripId);

    const suggestion = await this.prisma.activitySuggestion.findFirst({
      where: { id: suggestionId, tripId },
    });

    if (!suggestion) {
      throw new NotFoundException(`Suggestion with ID '${suggestionId}' was not found.`);
    }

    const existingVote = await this.prisma.suggestionVote.findUnique({
      where: {
        suggestionId_userId: {
          suggestionId,
          userId,
        },
      },
    });

    if (existingVote) {
      await this.prisma.suggestionVote.delete({
        where: { id: existingVote.id },
      });
    }

    const updated = await this.prisma.activitySuggestion.findUniqueOrThrow({
      where: { id: suggestionId },
      include: {
        suggestedBy: true,
        votes: {
          include: { user: true },
        },
      },
    });

    return this.formatSuggestion(updated, userId);
  }

  /**
   * Approve or reject a suggestion (Owner only).
   * When approved, creates a confirmed Activity record in the day itinerary.
   */
  async updateSuggestionStatus(
    userId: string,
    tripId: string,
    suggestionId: string,
    dto: UpdateSuggestionStatusDto,
  ): Promise<ActivitySuggestion> {
    // Only trip owner can approve or reject
    await this.collaborationService.validateTripOwner(userId, tripId);

    const suggestion = await this.prisma.activitySuggestion.findFirst({
      where: { id: suggestionId, tripId },
      include: {
        suggestedBy: true,
      },
    });

    if (!suggestion) {
      throw new NotFoundException(`Suggestion with ID '${suggestionId}' was not found.`);
    }

    if (dto.status === 'APPROVED') {
      await this.prisma.$transaction(async (tx) => {
        // Update suggestion status
        await tx.activitySuggestion.update({
          where: { id: suggestionId },
          data: { status: 'APPROVED' },
        });

        // Determine next sort order for this day
        const lastActivity = await tx.activity.findFirst({
          where: { itineraryDayId: suggestion.itineraryDayId },
          orderBy: { sortOrder: 'desc' },
        });
        const nextSortOrder = lastActivity ? lastActivity.sortOrder + 1 : 0;

        // Insert into actual activities
        await tx.activity.create({
          data: {
            itineraryDayId: suggestion.itineraryDayId,
            title: suggestion.title,
            description: suggestion.description,
            location: suggestion.location,
            latitude: suggestion.latitude,
            longitude: suggestion.longitude,
            startTime: suggestion.startTime,
            durationMinutes: suggestion.durationMinutes,
            notes: `Suggested by ${suggestion.suggestedBy.name}`,
            sortOrder: nextSortOrder,
            isCompleted: false,
          },
        });
      });
    } else {
      await this.prisma.activitySuggestion.update({
        where: { id: suggestionId },
        data: { status: 'REJECTED' },
      });
    }

    const updated = await this.prisma.activitySuggestion.findUniqueOrThrow({
      where: { id: suggestionId },
      include: {
        suggestedBy: true,
        votes: {
          include: { user: true },
        },
      },
    });

    return this.formatSuggestion(updated, userId);
  }
}
