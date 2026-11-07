import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiResponse,
  CategoryCount,
  Destination,
  PaginatedResult,
} from '@tripnest/shared';
import { DestinationsService } from './destinations.service';
import { GetDestinationsDto } from './dto/get-destinations.dto';

@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  /**
   * List paginated destinations with search and filters.
   */
  @Get()
  async findAll(
    @Query() query: GetDestinationsDto,
  ): Promise<ApiResponse<PaginatedResult<Destination>>> {
    const data = await this.destinationsService.findAll(query);
    return {
      success: true,
      data,
    };
  }

  /**
   * Curated featured destinations.
   */
  @Get('featured')
  async findFeatured(): Promise<ApiResponse<Destination[]>> {
    const data = await this.destinationsService.findFeatured();
    return {
      success: true,
      data,
    };
  }

  /**
   * Destination category list with destination counts.
   */
  @Get('categories')
  async getCategories(): Promise<ApiResponse<CategoryCount[]>> {
    const data = await this.destinationsService.getCategories();
    return {
      success: true,
      data,
    };
  }

  /**
   * Retrieve destination details by slug.
   */
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string): Promise<ApiResponse<Destination>> {
    const data = await this.destinationsService.findBySlug(slug);
    return {
      success: true,
      data,
    };
  }
}
