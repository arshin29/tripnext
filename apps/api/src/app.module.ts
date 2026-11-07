import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import configuration from './config/configuration';
import { DestinationsModule } from './destinations/destinations.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { SavedDestinationsModule } from './saved-destinations/saved-destinations.module';
import { TripsModule } from './trips/trips.module';
import { AiModule } from './ai/ai.module';
import { GeocodingModule } from './geocoding/geocoding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    DestinationsModule,
    SavedDestinationsModule,
    TripsModule,
    AiModule,
    GeocodingModule,
  ],
})
export class AppModule {}
