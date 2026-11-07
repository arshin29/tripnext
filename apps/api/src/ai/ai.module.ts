import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TripsModule } from '../trips/trips.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { FallbackConciergeService } from './fallback-concierge.service';

@Module({
  imports: [PrismaModule, AuthModule, TripsModule],
  controllers: [AiController],
  providers: [AiService, FallbackConciergeService],
  exports: [AiService, FallbackConciergeService],
})
export class AiModule {}
