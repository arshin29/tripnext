import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthResponse } from '@tripnest/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async checkHealth(): Promise<HealthResponse> {
    const environment = this.configService.get<string>('nodeEnv', 'development');
    const uptime = Number(((Date.now() - this.startTime) / 1000).toFixed(2));

    const dbHealth = await this.prismaService.checkHealth();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime,
      environment,
      version: '1.0.0',
      database: dbHealth,
    };
  }
}
