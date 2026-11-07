import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Activity as PrismaActivity,
  Destination as PrismaDestination,
  ItineraryDay as PrismaItineraryDay,
  Prisma,
  Trip as PrismaTrip,
  TripMember as PrismaTripMember,
  User as PrismaUser,
} from '@prisma/client';
import {
  Activity,
  ItineraryDay,
  Trip,
  TripMember,
  TripMemberRole,
  TripStatus,
} from '@tripnest/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto, UpdateTripDto } from './dto';

type TripWithRelations = PrismaTrip & {
  destination?: PrismaDestination | null;
  user?: PrismaUser | null;
  members?: (PrismaTripMember & { user?: PrismaUser | null })[];
  itineraryDays?: (PrismaItineraryDay & {
    activities?: PrismaActivity[];
  })[];
};

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Derive dynamic trip status from trip dates.
   */
  computeTripStatus(startDate: Date, endDate: Date): TripStatus {
    const now = new Date();
    const start = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
      ),
    );
    const end = new Date(
      Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );

    if (now < start) {
      return 'UPCOMING';
    }
    if (now > end) {
      return 'COMPLETED';
    }
    return 'ONGOING';
  }

  /**
   * Format Prisma Trip record to shared Trip interface.
   */
  toTrip(record: TripWithRelations, currentUserId?: string): Trip {
    const derivedStatus = this.computeTripStatus(record.startDate, record.endDate);

    let activitiesCount = 0;
    let completedActivitiesCount = 0;

    const formattedDays: ItineraryDay[] | undefined = record.itineraryDays?.map((day) => {
      const formattedActivities: Activity[] = (day.activities || []).map((act) => ({
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
      }));

      activitiesCount += formattedActivities.length;
      completedActivitiesCount += formattedActivities.filter((a) => a.isCompleted).length;

      return {
        id: day.id,
        tripId: day.tripId,
        date: day.date.toISOString(),
        dayNumber: day.dayNumber,
        title: day.title,
        notes: day.notes,
        activities: formattedActivities,
        createdAt: day.createdAt.toISOString(),
        updatedAt: day.updatedAt.toISOString(),
      };
    });

    const formattedMembers: TripMember[] | undefined = record.members?.map((m) => ({
      id: m.id,
      tripId: m.tripId,
      userId: m.userId,
      role: m.role as TripMemberRole,
      joinedAt: m.joinedAt.toISOString(),
      user: m.user
        ? {
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            createdAt: m.user.createdAt.toISOString(),
            updatedAt: m.user.updatedAt.toISOString(),
          }
        : undefined,
    }));

    let isOwner = false;
    let currentUserRole: TripMemberRole | undefined = undefined;

    if (currentUserId) {
      if (record.userId === currentUserId) {
        isOwner = true;
        currentUserRole = 'OWNER';
      } else if (record.members) {
        const mem = record.members.find((m) => m.userId === currentUserId);
        if (mem) {
          currentUserRole = mem.role as TripMemberRole;
          isOwner = mem.role === 'OWNER';
        }
      }
    }

    return {
      id: record.id,
      userId: record.userId,
      destinationId: record.destinationId,
      title: record.title,
      description: record.description,
      startDate: record.startDate.toISOString(),
      endDate: record.endDate.toISOString(),
      travelerCount: record.travelerCount,
      budgetAmount: record.budgetAmount !== null ? Number(record.budgetAmount) : null,
      currency: record.currency,
      coverImage: record.coverImage,
      status: derivedStatus,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      destination: record.destination
        ? {
            id: record.destination.id,
            name: record.destination.name,
            slug: record.destination.slug,
            city: record.destination.city,
            country: record.destination.country,
            shortDescription: record.destination.shortDescription,
            detailedDescription: record.destination.detailedDescription,
            category: record.destination.category,
            coverImage: record.destination.coverImage,
            galleryImages: record.destination.galleryImages,
            attractions: record.destination.attractions,
            bestTimeToVisit: record.destination.bestTimeToVisit,
            approximateDuration: record.destination.approximateDuration,
            isFeatured: record.destination.isFeatured,
            latitude: record.destination.latitude,
            longitude: record.destination.longitude,
            createdAt: record.destination.createdAt.toISOString(),
            updatedAt: record.destination.updatedAt.toISOString(),
          }
        : undefined,
      user: record.user
        ? {
            id: record.user.id,
            name: record.user.name,
            email: record.user.email,
            createdAt: record.user.createdAt.toISOString(),
            updatedAt: record.user.updatedAt.toISOString(),
          }
        : undefined,
      itineraryDays: formattedDays,
      activitiesCount,
      completedActivitiesCount,
      members: formattedMembers,
      isOwner,
      currentUserRole,
    };
  }

  /**
   * Verify trip existence and access (OWNER or MEMBER).
   */
  async validateTripAccess(
    userId: string,
    tripId: string,
  ): Promise<{ trip: TripWithRelations; role: TripMemberRole }> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        destination: true,
        user: true,
        members: {
          include: {
            user: true,
          },
        },
        itineraryDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            activities: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID '${tripId}' was not found.`);
    }

    const member = (trip.members || []).find((m) => m.userId === userId);
    const isDirectOwner = trip.userId === userId;

    if (!member && !isDirectOwner) {
      throw new ForbiddenException(
        'You do not have permission to access or modify this trip.',
      );
    }

    const role: TripMemberRole =
      isDirectOwner || member?.role === 'OWNER' ? 'OWNER' : 'MEMBER';
    return { trip, role };
  }

  /**
   * Verify trip existence and strict OWNER role.
   */
  async validateTripOwnership(
    userId: string,
    tripId: string,
  ): Promise<TripWithRelations> {
    const { trip, role } = await this.validateTripAccess(userId, tripId);

    if (role !== 'OWNER') {
      throw new ForbiddenException('Only the trip owner can perform this action.');
    }

    return trip;
  }

  /**
   * Create a new trip, initial itinerary days, and associate creator as OWNER in trip_members.
   */
  async createTrip(userId: string, dto: CreateTripDto): Promise<Trip> {
    const destination = await this.prisma.destination.findUnique({
      where: { id: dto.destinationId },
    });

    if (!destination) {
      throw new NotFoundException(
        `Destination with ID '${dto.destinationId}' was not found.`,
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid start or end date format.');
    }

    if (endDate < startDate) {
      throw new BadRequestException('Trip end date cannot be earlier than start date.');
    }

    // Calculate inclusive day count
    const msPerDay = 1000 * 60 * 60 * 24;
    const dayCount = Math.round((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;

    if (dayCount > 90) {
      throw new BadRequestException('Trip duration cannot exceed 90 days.');
    }

    const coverImage = dto.coverImage || destination.coverImage;

    // Generate day records
    const daysData = [];
    for (let i = 0; i < dayCount; i++) {
      const dayDate = new Date(startDate.getTime() + i * msPerDay);
      daysData.push({
        dayNumber: i + 1,
        date: dayDate,
        title: `Day ${i + 1}`,
      });
    }

    // Atomic nested write: creates trip, initial itinerary days, and OWNER trip member in a single operation
    const createdTrip = await this.prisma.trip.create({
      data: {
        userId,
        destinationId: dto.destinationId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        startDate,
        endDate,
        travelerCount: dto.travelerCount || 1,
        budgetAmount:
          dto.budgetAmount !== undefined ? new Prisma.Decimal(dto.budgetAmount) : null,
        currency: dto.currency || 'INR',
        coverImage,
        status: this.computeTripStatus(startDate, endDate),
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
        itineraryDays: {
          create: daysData,
        },
      },
      include: {
        destination: true,
        user: true,
        members: {
          include: { user: true },
        },
        itineraryDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            activities: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return this.toTrip(createdTrip, userId);
  }

  /**
   * List all trips owned by the authenticated user with optional status filter.
   */
  async getUserTrips(userId: string, status?: TripStatus): Promise<Trip[]> {
    const trips = await this.prisma.trip.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
      include: {
        destination: true,
        user: true,
        members: {
          include: { user: true },
        },
        itineraryDays: {
          include: {
            activities: true,
          },
        },
      },
    });

    const formatted = trips.map((trip) => this.toTrip(trip, userId));
    if (status) {
      return formatted.filter((t) => t.status === status);
    }
    return formatted;
  }

  /**
   * List all trips shared with the authenticated user where they are a MEMBER.
   */
  async getSharedTrips(userId: string): Promise<Trip[]> {
    const memberships = await this.prisma.tripMember.findMany({
      where: {
        userId,
        role: 'MEMBER',
      },
      include: {
        trip: {
          include: {
            destination: true,
            user: true,
            members: {
              include: { user: true },
            },
            itineraryDays: {
              include: {
                activities: true,
              },
            },
          },
        },
      },
      orderBy: { trip: { startDate: 'asc' } },
    });

    return memberships.map((m) => this.toTrip(m.trip, userId));
  }

  /**
   * Get detailed trip information by ID (Accessible by OWNER or MEMBER).
   */
  async getTripById(userId: string, tripId: string): Promise<Trip> {
    const { trip } = await this.validateTripAccess(userId, tripId);
    return this.toTrip(trip, userId);
  }

  /**
   * Update trip details (Owner only).
   */
  async updateTrip(userId: string, tripId: string, dto: UpdateTripDto): Promise<Trip> {
    const existing = await this.validateTripOwnership(userId, tripId);

    const updateData: Prisma.TripUpdateInput = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title.trim();
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description.trim();
    }
    if (dto.travelerCount !== undefined) {
      updateData.travelerCount = dto.travelerCount;
    }
    if (dto.budgetAmount !== undefined) {
      updateData.budgetAmount = new Prisma.Decimal(dto.budgetAmount);
    }
    if (dto.currency !== undefined) {
      updateData.currency = dto.currency;
    }
    if (dto.coverImage !== undefined) {
      updateData.coverImage = dto.coverImage;
    }

    if (dto.destinationId) {
      const destination = await this.prisma.destination.findUnique({
        where: { id: dto.destinationId },
      });
      if (!destination) {
        throw new NotFoundException(
          `Destination with ID '${dto.destinationId}' was not found.`,
        );
      }
      updateData.destination = { connect: { id: dto.destinationId } };
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : existing.endDate;

    if (endDate < startDate) {
      throw new BadRequestException('Trip end date cannot be earlier than start date.');
    }

    if (dto.startDate || dto.endDate) {
      updateData.startDate = startDate;
      updateData.endDate = endDate;
      updateData.status = this.computeTripStatus(startDate, endDate);
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        destination: true,
        user: true,
        members: {
          include: { user: true },
        },
        itineraryDays: {
          orderBy: { dayNumber: 'asc' },
          include: {
            activities: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return this.toTrip(updated, userId);
  }

  /**
   * Delete a trip and cascade delete its days, activities, members, and expenses (Owner only).
   */
  async deleteTrip(
    userId: string,
    tripId: string,
  ): Promise<{ success: boolean; tripId: string }> {
    await this.validateTripOwnership(userId, tripId);

    await this.prisma.trip.delete({
      where: { id: tripId },
    });

    return {
      success: true,
      tripId,
    };
  }
}
