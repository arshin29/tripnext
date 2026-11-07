import { Injectable, NotFoundException } from '@nestjs/common';
import { Destination as PrismaDestination, Prisma } from '@prisma/client';
import { CategoryCount, Destination, PaginatedResult } from '@tripnest/shared';
import { PrismaService } from '../prisma/prisma.service';
import { GetDestinationsDto } from './dto/get-destinations.dto';

@Injectable()
export class DestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Format Prisma Destination record to shared Destination interface.
   */
  toDestination(destination: PrismaDestination): Destination {
    return {
      id: destination.id,
      name: destination.name,
      slug: destination.slug,
      city: destination.city,
      country: destination.country,
      shortDescription: destination.shortDescription,
      detailedDescription: destination.detailedDescription,
      category: destination.category,
      coverImage: destination.coverImage,
      galleryImages: destination.galleryImages,
      attractions: destination.attractions,
      bestTimeToVisit: destination.bestTimeToVisit,
      approximateDuration: destination.approximateDuration,
      isFeatured: destination.isFeatured,
      latitude: destination.latitude,
      longitude: destination.longitude,
      createdAt: destination.createdAt.toISOString(),
      updatedAt: destination.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieve paginated destinations with optional search, category, and featured filters.
   */
  async findAll(query: GetDestinationsDto): Promise<PaginatedResult<Destination>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 12;
    const skip = (page - 1) * limit;

    const where: Prisma.DestinationWhereInput = {};

    if (query.search && query.search.trim().length > 0) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { country: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (
      query.category &&
      query.category.trim().length > 0 &&
      query.category.toLowerCase() !== 'all'
    ) {
      where.category = { equals: query.category.trim(), mode: 'insensitive' };
    }

    if (typeof query.featured === 'boolean') {
      where.isFeatured = query.featured;
    }

    const orderBy: Prisma.DestinationOrderByWithRelationInput = {
      [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
    };

    const [items, total] = await Promise.all([
      this.prisma.destination.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.destination.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items: items.map((item) => this.toDestination(item)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Find destination by unique URL slug.
   */
  async findBySlug(slug: string): Promise<Destination> {
    const destination = await this.prisma.destination.findUnique({
      where: { slug },
    });

    if (!destination) {
      throw new NotFoundException(`Destination with slug '${slug}' was not found.`);
    }

    return this.toDestination(destination);
  }

  /**
   * Find curated featured destinations.
   */
  async findFeatured(limit = 6): Promise<Destination[]> {
    const destinations = await this.prisma.destination.findMany({
      where: { isFeatured: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return destinations.map((d) => this.toDestination(d));
  }

  /**
   * Get counts of destinations grouped by category.
   */
  async getCategories(): Promise<CategoryCount[]> {
    const grouped = await this.prisma.destination.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
      orderBy: {
        category: 'asc',
      },
    });

    return grouped.map((group) => ({
      name: group.category,
      count: group._count.category,
    }));
  }
}
