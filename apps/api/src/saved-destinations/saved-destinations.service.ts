import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Destination as PrismaDestination,
  SavedDestination as PrismaSavedDestination,
} from '@prisma/client';
import { SavedDestination } from '@tripnest/shared';
import { PrismaService } from '../prisma/prisma.service';

type SavedWithDestination = PrismaSavedDestination & {
  destination: PrismaDestination;
};

@Injectable()
export class SavedDestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Format saved destination record with embedded destination into shared interface.
   */
  private toSavedDestination(record: SavedWithDestination): SavedDestination {
    return {
      id: record.id,
      userId: record.userId,
      destinationId: record.destinationId,
      createdAt: record.createdAt.toISOString(),
      destination: {
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
        createdAt: record.destination.createdAt.toISOString(),
        updatedAt: record.destination.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Get all saved destinations for the authenticated user.
   */
  async getUserSaved(userId: string): Promise<SavedDestination[]> {
    const records = await this.prisma.savedDestination.findMany({
      where: { userId },
      include: { destination: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.toSavedDestination(record));
  }

  /**
   * Save a destination to the user's wishlist (idempotent duplicate prevention).
   */
  async save(userId: string, destinationId: string): Promise<SavedDestination> {
    const destination = await this.prisma.destination.findUnique({
      where: { id: destinationId },
    });

    if (!destination) {
      throw new NotFoundException(`Destination with ID '${destinationId}' not found.`);
    }

    const existing = await this.prisma.savedDestination.findUnique({
      where: {
        userId_destinationId: {
          userId,
          destinationId,
        },
      },
      include: { destination: true },
    });

    if (existing) {
      return this.toSavedDestination(existing);
    }

    const created = await this.prisma.savedDestination.create({
      data: {
        userId,
        destinationId,
      },
      include: { destination: true },
    });

    return this.toSavedDestination(created);
  }

  /**
   * Remove a destination from the user's wishlist.
   */
  async remove(
    userId: string,
    destinationId: string,
  ): Promise<{ success: boolean; destinationId: string }> {
    const existing = await this.prisma.savedDestination.findUnique({
      where: {
        userId_destinationId: {
          userId,
          destinationId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Destination is not in your saved list.');
    }

    await this.prisma.savedDestination.delete({
      where: {
        userId_destinationId: {
          userId,
          destinationId,
        },
      },
    });

    return {
      success: true,
      destinationId,
    };
  }
}
