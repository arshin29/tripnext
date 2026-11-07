import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import {
  ApiResponse,
  CategoryCount,
  Destination,
  PaginatedResult,
} from '@tripnest/shared';
import { DestinationsService } from './destinations.service';
import { GetDestinationsDto } from './dto/get-destinations.dto';

const PUBLIC_DESTINATION_CACHE_CONTROL =
  'public, s-maxage=3600, stale-while-revalidate=86400';

@Controller('destinations')
export class DestinationsController {
  constructor(private readonly destinationsService: DestinationsService) {}

  /**
   * List paginated destinations with search and filters.
   */
  @Get()
  @Header('Cache-Control', PUBLIC_DESTINATION_CACHE_CONTROL)
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
  @Header('Cache-Control', PUBLIC_DESTINATION_CACHE_CONTROL)
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
  @Header('Cache-Control', PUBLIC_DESTINATION_CACHE_CONTROL)
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
  @Header('Cache-Control', PUBLIC_DESTINATION_CACHE_CONTROL)
  async findBySlug(@Param('slug') slug: string): Promise<ApiResponse<Destination>> {
    const data = await this.destinationsService.findBySlug(slug);
    return {
      success: true,
      data,
    };
  }
}
