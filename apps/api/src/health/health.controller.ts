import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthResponse } from '@tripnest/shared';
import { HealthService } from './health.service';

// Health check endpoint controller for TripNext API (Verified Live Watch Mode)
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getHealth(): Promise<HealthResponse> {
    return this.healthService.checkHealth();
  }
}
