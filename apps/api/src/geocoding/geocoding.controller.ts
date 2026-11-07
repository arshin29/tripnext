import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiResponse, GeocodeResult } from '@tripnest/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GeocodeQueryDto } from './dto/geocode-query.dto';
import { GeocodingService } from './geocoding.service';

@Controller('geocoding')
@UseGuards(JwtAuthGuard)
export class GeocodingController {
  constructor(private readonly geocodingService: GeocodingService) {}

  @Get('search')
  async search(
    @Query() queryDto: GeocodeQueryDto,
  ): Promise<ApiResponse<GeocodeResult[]>> {
    const data = await this.geocodingService.geocode(
      queryDto.q,
      queryDto.contextHint,
    );
    return {
      success: true,
      data,
      message: 'Geocoding search completed.',
    };
  }
}
