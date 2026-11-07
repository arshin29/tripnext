import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SavedDestinationsController } from './saved-destinations.controller';
import { SavedDestinationsService } from './saved-destinations.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SavedDestinationsController],
  providers: [SavedDestinationsService],
  exports: [SavedDestinationsService],
})
export class SavedDestinationsModule {}
