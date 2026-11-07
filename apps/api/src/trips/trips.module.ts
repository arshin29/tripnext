import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CollaborationService } from './collaboration.service';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { InvitationsController } from './invitations.controller';
import { ItineraryService } from './itinerary.service';
import { SuggestionsService } from './suggestions.service';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TripsController, InvitationsController, ExpensesController],
  providers: [
    TripsService,
    ItineraryService,
    CollaborationService,
    SuggestionsService,
    ExpensesService,
  ],
  exports: [
    TripsService,
    ItineraryService,
    CollaborationService,
    SuggestionsService,
    ExpensesService,
  ],
})
export class TripsModule {}
