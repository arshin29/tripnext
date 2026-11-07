import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Activity as PrismaActivity,
  ItineraryDay as PrismaItineraryDay,
} from '@prisma/client';
import { Activity, ItineraryDay } from '@tripnest/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateActivityDto,
  CreateItineraryDayDto,
  ReorderActivitiesDto,
  UpdateActivityDto,
  UpdateItineraryDayDto,
} from './dto';
import { TripsService } from './trips.service';

@Injectable()
export class ItineraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tripsService: TripsService,
  ) {}

  /**
   * Format Prisma Activity to shared interface.
   */
  private toActivity(act: PrismaActivity): Activity {
    return {
      id: act.id,
      itineraryDayId: act.itineraryDayId,
      title: act.title,
      description: act.description,
      location: act.location,
      latitude: act.latitude,
      longitude: act.longitude,
      startTime: act.startTime,
      durationMinutes: act.durationMinutes,
      notes: act.notes,
      sortOrder: act.sortOrder,
      isCompleted: act.isCompleted,
      createdAt: act.createdAt.toISOString(),
      updatedAt: act.updatedAt.toISOString(),
    };
  }

  /**
   * Format Prisma ItineraryDay to shared interface.
   */
  private toItineraryDay(
    day: PrismaItineraryDay & { activities?: PrismaActivity[] },
  ): ItineraryDay {
    return {
      id: day.id,
      tripId: day.tripId,
      date: day.date.toISOString(),
      dayNumber: day.dayNumber,
      title: day.title,
      notes: day.notes,
      activities: (day.activities || []).map((a) => this.toActivity(a)),
      createdAt: day.createdAt.toISOString(),
      updatedAt: day.updatedAt.toISOString(),
    };
  }

  /**
   * Get full itinerary days and activities for a trip (Owner or Member).
   */
  async getItinerary(userId: string, tripId: string): Promise<ItineraryDay[]> {
    await this.tripsService.validateTripAccess(userId, tripId);

    const days = await this.prisma.itineraryDay.findMany({
      where: { tripId },
      orderBy: { dayNumber: 'asc' },
      include: {
        activities: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return days.map((day) => this.toItineraryDay(day));
  }

  /**
   * Add an itinerary day within valid trip date boundaries (Owner only).
   */
  async createDay(
    userId: string,
    tripId: string,
    dto: CreateItineraryDayDto,
  ): Promise<ItineraryDay> {
    const trip = await this.tripsService.validateTripOwnership(userId, tripId);

    const date = new Date(dto.date);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date format.');
    }

    // Validate date falls within trip range
    const dayDate = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
    const startDate = new Date(
      Date.UTC(
        trip.startDate.getUTCFullYear(),
        trip.startDate.getUTCMonth(),
        trip.startDate.getUTCDate(),
      ),
    );
    const endDate = new Date(
      Date.UTC(
        trip.endDate.getUTCFullYear(),
        trip.endDate.getUTCMonth(),
        trip.endDate.getUTCDate(),
      ),
    );

    if (dayDate < startDate || dayDate > endDate) {
      throw new BadRequestException(
        'Itinerary day date must fall within the trip start and end dates.',
      );
    }

    // Check for dayNumber conflict
    const existingDayNumber = await this.prisma.itineraryDay.findUnique({
      where: {
        tripId_dayNumber: {
          tripId,
          dayNumber: dto.dayNumber,
        },
      },
    });

    if (existingDayNumber) {
      throw new BadRequestException(
        `Day number ${dto.dayNumber} already exists for this trip.`,
      );
    }

    // Check for date conflict
    const existingDate = await this.prisma.itineraryDay.findUnique({
      where: {
        tripId_date: {
          tripId,
          date,
        },
      },
    });

    if (existingDate) {
      throw new BadRequestException('An itinerary day already exists for this date.');
    }

    const created = await this.prisma.itineraryDay.create({
      data: {
        tripId,
        dayNumber: dto.dayNumber,
        date,
        title: dto.title?.trim() || `Day ${dto.dayNumber}`,
        notes: dto.notes?.trim(),
      },
      include: {
        activities: true,
      },
    });

    return this.toItineraryDay(created);
  }

  /**
   * Update itinerary day title and notes (Owner only).
   */
  async updateDay(
    userId: string,
    tripId: string,
    dayId: string,
    dto: UpdateItineraryDayDto,
  ): Promise<ItineraryDay> {
    await this.tripsService.validateTripOwnership(userId, tripId);

    const day = await this.prisma.itineraryDay.findFirst({
      where: { id: dayId, tripId },
    });

    if (!day) {
      throw new NotFoundException(
        `Itinerary day with ID '${dayId}' not found for this trip.`,
      );
    }

    const updated = await this.prisma.itineraryDay.update({
      where: { id: dayId },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() : undefined,
      },
      include: {
        activities: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    return this.toItineraryDay(updated);
  }

  /**
   * Delete an itinerary day if valid (Owner only).
   */
  async deleteDay(
    userId: string,
    tripId: string,
    dayId: string,
  ): Promise<{ success: boolean; dayId: string }> {
    await this.tripsService.validateTripOwnership(userId, tripId);

    const day = await this.prisma.itineraryDay.findFirst({
      where: { id: dayId, tripId },
    });

    if (!day) {
      throw new NotFoundException(
        `Itinerary day with ID '${dayId}' not found for this trip.`,
      );
    }

    await this.prisma.itineraryDay.delete({
      where: { id: dayId },
    });

    return {
      success: true,
      dayId,
    };
  }

  /**
   * Add an activity to an itinerary day (Owner or Member).
   */
  async createActivity(
    userId: string,
    tripId: string,
    dto: CreateActivityDto,
  ): Promise<Activity> {
    await this.tripsService.validateTripAccess(userId, tripId);

    const day = await this.prisma.itineraryDay.findFirst({
      where: { id: dto.itineraryDayId, tripId },
    });

    if (!day) {
      throw new NotFoundException(
        `Itinerary day with ID '${dto.itineraryDayId}' not found on this trip.`,
      );
    }

    // Determine next sortOrder
    const lastActivity = await this.prisma.activity.findFirst({
      where: { itineraryDayId: dto.itineraryDayId },
      orderBy: { sortOrder: 'desc' },
    });

    const nextSortOrder = lastActivity ? lastActivity.sortOrder + 1 : 0;

    // Validate coordinate pair
    if (
      (dto.latitude !== undefined && dto.longitude === undefined) ||
      (dto.latitude === undefined && dto.longitude !== undefined)
    ) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together as a coordinate pair.',
      );
    }

    const activity = await this.prisma.activity.create({
      data: {
        itineraryDayId: dto.itineraryDayId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        location: dto.location?.trim(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        startTime: dto.startTime?.trim(),
        durationMinutes: dto.durationMinutes,
        notes: dto.notes?.trim(),
        sortOrder: nextSortOrder,
        isCompleted: false,
      },
    });

    return this.toActivity(activity);
  }

  /**
   * Update an existing activity (Owner or Member).
   */
  async updateActivity(
    userId: string,
    tripId: string,
    activityId: string,
    dto: UpdateActivityDto,
  ): Promise<Activity> {
    await this.tripsService.validateTripAccess(userId, tripId);

    const activity = await this.prisma.activity.findFirst({
      where: {
        id: activityId,
        itineraryDay: {
          tripId,
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(
        `Activity with ID '${activityId}' not found in this trip.`,
      );
    }

    // Validate coordinate pair if either is explicitly passed
    const resultingLat = dto.latitude !== undefined ? dto.latitude : activity.latitude;
    const resultingLng = dto.longitude !== undefined ? dto.longitude : activity.longitude;
    if (
      (resultingLat !== null && resultingLat !== undefined && (resultingLng === null || resultingLng === undefined)) ||
      (resultingLng !== null && resultingLng !== undefined && (resultingLat === null || resultingLat === undefined))
    ) {
      throw new BadRequestException(
        'Latitude and longitude must be provided together as a coordinate pair.',
      );
    }

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        description: dto.description !== undefined ? dto.description.trim() : undefined,
        location: dto.location !== undefined ? dto.location.trim() : undefined,
        latitude: dto.latitude !== undefined ? dto.latitude : undefined,
        longitude: dto.longitude !== undefined ? dto.longitude : undefined,
        startTime: dto.startTime !== undefined ? dto.startTime.trim() : undefined,
        durationMinutes:
          dto.durationMinutes !== undefined ? dto.durationMinutes : undefined,
        notes: dto.notes !== undefined ? dto.notes.trim() : undefined,
        isCompleted: dto.isCompleted !== undefined ? dto.isCompleted : undefined,
      },
    });

    return this.toActivity(updated);
  }

  /**
   * Delete an activity from an itinerary day (Owner or Member).
   */
  async deleteActivity(
    userId: string,
    tripId: string,
    activityId: string,
  ): Promise<{ success: boolean; activityId: string }> {
    await this.tripsService.validateTripAccess(userId, tripId);

    const activity = await this.prisma.activity.findFirst({
      where: {
        id: activityId,
        itineraryDay: {
          tripId,
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(
        `Activity with ID '${activityId}' not found in this trip.`,
      );
    }

    await this.prisma.activity.delete({
      where: { id: activityId },
    });

    return {
      success: true,
      activityId,
    };
  }

  /**
   * Toggle activity completed status (Owner or Member).
   */
  async toggleComplete(
    userId: string,
    tripId: string,
    activityId: string,
  ): Promise<Activity> {
    await this.tripsService.validateTripAccess(userId, tripId);

    const activity = await this.prisma.activity.findFirst({
      where: {
        id: activityId,
        itineraryDay: {
          tripId,
        },
      },
    });

    if (!activity) {
      throw new NotFoundException(
        `Activity with ID '${activityId}' not found in this trip.`,
      );
    }

    const updated = await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        isCompleted: !activity.isCompleted,
      },
    });

    return this.toActivity(updated);
  }

  /**
   * Reorder activities within an itinerary day (Owner or Member).
   */
  async reorderActivities(
    userId: string,
    tripId: string,
    dto: ReorderActivitiesDto,
  ): Promise<Activity[]> {
    await this.tripsService.validateTripAccess(userId, tripId);

    const day = await this.prisma.itineraryDay.findFirst({
      where: { id: dto.itineraryDayId, tripId },
      include: { activities: true },
    });

    if (!day) {
      throw new NotFoundException(
        `Itinerary day with ID '${dto.itineraryDayId}' not found in this trip.`,
      );
    }

    const dayActivityIds = new Set(day.activities.map((a) => a.id));

    // Ensure all provided IDs belong to this day
    for (const id of dto.activityIds) {
      if (!dayActivityIds.has(id)) {
        throw new BadRequestException(
          `Activity with ID '${id}' does not belong to day '${dto.itineraryDayId}'.`,
        );
      }
    }

    // Execute reordering inside transaction
    await this.prisma.$transaction(
      dto.activityIds.map((id, index) =>
        this.prisma.activity.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    const updated = await this.prisma.activity.findMany({
      where: { itineraryDayId: dto.itineraryDayId },
      orderBy: { sortOrder: 'asc' },
    });

    return updated.map((a) => this.toActivity(a));
  }
}
