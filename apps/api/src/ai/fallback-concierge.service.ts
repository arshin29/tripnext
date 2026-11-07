import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import {
  Activity as PrismaActivity,
  Destination as PrismaDestination,
  ItineraryDay as PrismaItineraryDay,
  Trip as PrismaTrip,
} from '@prisma/client';
import {
  AiActivityProposal,
  AiConciergeResponse,
  AiPace,
  AiTripTheme,
} from '@tripnest/shared';
import { GenerateSuggestionsDto } from './dto';

type TripWithDestinationAndDays = PrismaTrip & {
  destination?: PrismaDestination | null;
  itineraryDays?: (PrismaItineraryDay & {
    activities?: PrismaActivity[];
  })[];
};

interface TimeSlot {
  startTime: string;
  durationMinutes: number;
  period: 'Morning' | 'Afternoon' | 'Evening';
}

@Injectable()
export class FallbackConciergeService {
  private readonly logger = new Logger(FallbackConciergeService.name);

  private readonly TIME_SLOTS: Record<AiPace, TimeSlot[]> = {
    RELAXED: [
      { startTime: '10:30', durationMinutes: 120, period: 'Morning' },
    ],
    BALANCED: [
      { startTime: '09:30', durationMinutes: 120, period: 'Morning' },
      { startTime: '14:30', durationMinutes: 120, period: 'Afternoon' },
    ],
    INTENSIVE: [
      { startTime: '09:00', durationMinutes: 120, period: 'Morning' },
      { startTime: '14:00', durationMinutes: 120, period: 'Afternoon' },
      { startTime: '18:30', durationMinutes: 90, period: 'Evening' },
    ],
    PACKED: [
      { startTime: '09:00', durationMinutes: 120, period: 'Morning' },
      { startTime: '14:00', durationMinutes: 120, period: 'Afternoon' },
      { startTime: '18:30', durationMinutes: 90, period: 'Evening' },
    ],
  };

  /**
   * Generate deterministic curated activity proposals using genuine destination attractions.
   * Never fabricates coordinates or costs.
   */
  generateCuratedSuggestions(
    trip: TripWithDestinationAndDays,
    dto?: GenerateSuggestionsDto,
  ): AiConciergeResponse {
    const rawPace = dto?.pace || dto?.pacing || 'BALANCED';
    const pace: AiPace = rawPace === 'PACKED' ? 'INTENSIVE' : rawPace;
    const themes: AiTripTheme[] =
      dto?.themes && dto.themes.length > 0 ? dto.themes : ['CULTURE', 'FOOD'];
    const destination = trip.destination;
    const destinationName = destination?.name || trip.title;

    this.logger.log(
      `Generating curated fallback proposals for trip '${trip.id}' (${destinationName}) at pace '${pace}'`,
    );

    const attractions: string[] =
      destination?.attractions && destination.attractions.length > 0
        ? destination.attractions
        : [`Explore ${destinationName} city center`, `Local ${destinationName} walking tour`];

    const sortedDays = (trip.itineraryDays || [])
      .slice()
      .sort((a, b) => a.dayNumber - b.dayNumber);

    const slotsPerDay = this.TIME_SLOTS[pace] || this.TIME_SLOTS.BALANCED;
    const proposals: AiActivityProposal[] = [];

    let attractionIndex = 0;

    for (const day of sortedDays) {
      for (let s = 0; s < slotsPerDay.length; s++) {
        const slot = slotsPerDay[s];
        const attraction = attractions[attractionIndex % attractions.length];
        attractionIndex++;

        // Determine descriptive label and tags
        const primaryTheme = themes[proposals.length % themes.length];
        const tags = [
          'Curated Highlight',
          primaryTheme.charAt(0).toUpperCase() + primaryTheme.slice(1).toLowerCase(),
        ];

        proposals.push({
          id: randomUUID(),
          dayNumber: day.dayNumber,
          itineraryDayId: day.id,
          title: attraction,
          description: `Curated visit to ${attraction} in ${destinationName}. Discover one of the region's premier sights.`,
          location: destination ? `${attraction}, ${destination.city}` : attraction,
          // Explicit nulls: never invent coordinates or prices
          latitude: null,
          longitude: null,
          startTime: slot.startTime,
          durationMinutes: slot.durationMinutes,
          notes: `Recommended ${slot.period.toLowerCase()} activity. Please check seasonal opening hours and ticket availability prior to arrival.`,
          estimatedCost: null,
          currency: null,
          tags,
        });
      }
    }

    const summary = `Curated destination itinerary for ${trip.title} featuring ${proposals.length} key highlight${
      proposals.length === 1 ? '' : 's'
    } across ${sortedDays.length} day${sortedDays.length === 1 ? '' : 's'} in ${destinationName}.`;

    const disclaimer =
      'These suggestions are curated recommendations based on verified destination highlights. Latitude/longitude and admission costs are omitted to ensure accuracy; please verify local operating hours and fees independently.';

    return {
      tripId: trip.id,
      destinationName,
      source: 'CURATED_FALLBACK',
      modelUsed: null,
      suggestions: proposals,
      proposals,
      summary,
      disclaimer,
    };
  }
}
