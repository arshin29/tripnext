import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  async onModuleInit() {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log('Successfully connected to PostgreSQL database via Prisma');
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(
        `Database connection could not be established on startup: ${(error as Error).message}. Check DATABASE_URL and ensure PostgreSQL is running.`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }

  async checkHealth(): Promise<{
    status: 'connected' | 'disconnected';
    latencyMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      this.isConnected = true;
      return {
        status: 'connected',
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      this.isConnected = false;
      return {
        status: 'disconnected',
        error: (error as Error).message,
      };
    }
  }
}
