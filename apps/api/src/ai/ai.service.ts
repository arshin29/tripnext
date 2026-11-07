import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Activity as PrismaActivity, Prisma } from '@prisma/client';
import {
  GoogleGenAI,
  Type,
} from '@google/genai';
import {
  Activity,
  AiActivityProposal,
  AiConciergeResponse,
  AiPace,
  ImportAiProposalsResult,
} from '@tripnest/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TripsService } from '../trips/trips.service';
import { GenerateSuggestionsDto, ImportAiProposalsDto } from './dto';
import { FallbackConciergeService } from './fallback-concierge.service';

interface GeneratedGeminiItem {
  dayNumber?: number;
  title?: string;
  description?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  startTime?: string;
  durationMinutes?: number;
  notes?: string;
  estimatedCost?: number | null;
  currency?: string | null;
  tags?: string[];
}

interface GeneratedGeminiPayload {
  summary?: string;
  suggestions?: GeneratedGeminiItem[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly genAiClient: GoogleGenAI | null = null;
  private readonly modelName: string;
  private readonly timeoutMs: number;
  private readonly maxRequestsPerMinute: number;
  private readonly userRequestTimestamps = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly tripsService: TripsService,
    private readonly fallbackConciergeService: FallbackConciergeService,
  ) {
    const apiKey = this.configService.get<string>('geminiApiKey');
    this.modelName =
      this.configService.get<string>('geminiModel') || 'gemini-3.8-flash';
    this.timeoutMs =
      this.configService.get<number>('aiTimeoutMs') || 20000;
    this.maxRequestsPerMinute =
      this.configService.get<number>('aiRateLimitMaxPerMinute') || 5;

    if (apiKey && apiKey.trim().length > 0) {
      try {
        this.genAiClient = new GoogleGenAI({ apiKey });
        this.logger.log(
          `Google Gen AI initialized with model '${this.modelName}'.`,
        );
      } catch (err: unknown) {
        const error = err as Error;
        this.logger.error(
          `Failed to initialize Google Gen AI client: ${error?.message}`,
        );
        this.genAiClient = null;
      }
    } else {
      this.logger.warn(
        'GEMINI_API_KEY is not configured. Suggestion generation will use the Curated Fallback engine.',
      );
    }
  }

  /**
   * Check user rate limit (in-memory sliding window).
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const windowStart = now - 60_000;
    const timestamps = (this.userRequestTimestamps.get(userId) || []).filter(
      (ts) => ts > windowStart,
    );

    if (timestamps.length >= this.maxRequestsPerMinute) {
      return false;
    }

    timestamps.push(now);
    this.userRequestTimestamps.set(userId, timestamps);
    return true;
  }

  /**
   * Generate AI activity suggestions for a trip.
   * Leverages Gemini with structured output, falling back gracefully to Curated Fallback.
   */
  async generateSuggestions(
    userId: string,
    tripId: string,
    dto: GenerateSuggestionsDto,
  ): Promise<AiConciergeResponse> {
    const { trip } = await this.tripsService.validateTripAccess(userId, tripId);

    // If client is not configured or user exceeds rate limit, use deterministic fallback
    if (!this.genAiClient) {
      return this.fallbackConciergeService.generateCuratedSuggestions(
        trip,
        dto,
      );
    }

    if (!this.checkRateLimit(userId)) {
      this.logger.warn(
        `Rate limit exceeded for user '${userId}'. Serving curated fallback.`,
      );
      return this.fallbackConciergeService.generateCuratedSuggestions(
        trip,
        dto,
      );
    }

    // Attempt Gemini generation with timeout
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => {
      abortController.abort();
    }, this.timeoutMs);

    try {
      const destination = trip.destination;
      const destinationName =
        destination?.name || trip.title || 'the destination';
      const cityCountry = destination
        ? `${destination.city}, ${destination.country}`
        : destinationName;

      const sortedDays = (trip.itineraryDays || [])
        .slice()
        .sort((a, b) => a.dayNumber - b.dayNumber);

      const dayNumbers = sortedDays.map((d) => d.dayNumber);
      const rawPace = dto.pace || dto.pacing || 'BALANCED';
      const pace: AiPace = rawPace === 'PACKED' ? 'INTENSIVE' : rawPace;
      const themes =
        dto.themes && dto.themes.length > 0 ? dto.themes : ['CULTURE', 'FOOD'];
      const budget = dto.budgetLevel || 'MODERATE';

      const prompt = `You are the TripNext AI Travel Concierge.
Create a thoughtful, balanced itinerary of activity proposals for a trip to ${destinationName} (${cityCountry}).

Trip Context:
- Trip Title: ${trip.title}
- Available Itinerary Days: ${dayNumbers.length > 0 ? dayNumbers.join(', ') : '1'}
- Pace Preference: ${pace} (${pace === 'RELAXED' ? '1 activity per day' : pace === 'INTENSIVE' ? '3 activities per day' : '2 activities per day'})
- Themes: ${themes.join(', ')}
- Budget Level: ${budget}
${destination?.attractions && destination.attractions.length > 0 ? `- Popular Destination Attractions: ${destination.attractions.join(', ')}` : ''}
${dto.freeTextPrompt ? `- Traveler Note: "${dto.freeTextPrompt}"` : ''}

Guidelines:
1. Provide only realistic, genuine places, sights, or cultural activities.
2. Evenly distribute activities across the listed day numbers (${dayNumbers.join(', ')}).
3. Set sensible start times in 24-hour HH:MM format (e.g. 09:30, 14:00, 18:30) and durations in minutes (e.g. 90, 120).
4. For coordinates (latitude, longitude): only provide precise geographic coordinates if known with high confidence. Otherwise set both to null.
5. Provide a brief 1-2 sentence overview in the summary field.`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.STRING,
            description: 'A brief summary of the proposed itinerary.',
          },
          suggestions: {
            type: Type.ARRAY,
            description: 'List of proposed activities.',
            items: {
              type: Type.OBJECT,
              properties: {
                dayNumber: {
                  type: Type.INTEGER,
                  description: 'The 1-based day number matching the trip itinerary.',
                },
                title: {
                  type: Type.STRING,
                  description: 'Activity or attraction title (max 100 characters).',
                },
                description: {
                  type: Type.STRING,
                  description: 'Engaging 1-2 sentence description.',
                },
                location: {
                  type: Type.STRING,
                  description: 'Location, neighborhood, or landmark name.',
                },
                latitude: {
                  type: Type.NUMBER,
                  description: 'Latitude between -90 and 90, or null if uncertain.',
                },
                longitude: {
                  type: Type.NUMBER,
                  description: 'Longitude between -180 and 180, or null if uncertain.',
                },
                startTime: {
                  type: Type.STRING,
                  description: 'Start time in 24h HH:MM format.',
                },
                durationMinutes: {
                  type: Type.INTEGER,
                  description: 'Duration in minutes (e.g., 60, 90, 120, 180).',
                },
                notes: {
                  type: Type.STRING,
                  description: 'Helpful travel tips or reservation advice.',
                },
                estimatedCost: {
                  type: Type.NUMBER,
                  description: 'Estimated cost per person, or null if free/unknown.',
                },
                currency: {
                  type: Type.STRING,
                  description: 'Currency code (e.g. USD, EUR, JPY).',
                },
                tags: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Relevant theme tags.',
                },
              },
              required: ['dayNumber', 'title', 'durationMinutes'],
            },
          },
        },
        required: ['suggestions'],
      };

      const result = await this.genAiClient.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
          abortSignal: abortController.signal,
          systemInstruction:
            'You are an expert AI Travel Concierge. Always return valid structured JSON adhering strictly to the responseSchema.',
        },
      });

      const rawText = result?.text;
      if (!rawText) {
        throw new Error('Empty response received from Gemini.');
      }

      const parsed: GeneratedGeminiPayload = JSON.parse(rawText);
      const rawSuggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions
        : [];

      // Create a day number to itineraryDayId lookup
      const dayLookup = new Map<number, string>();
      for (const d of sortedDays) {
        dayLookup.set(d.dayNumber, d.id);
      }

      // Default fallback day ID if dayNumber doesn't match
      const defaultDayId = sortedDays[0]?.id || '';

      const sanitizedProposals: AiActivityProposal[] = rawSuggestions.map(
        (item) => {
          const dayNum =
            typeof item.dayNumber === 'number' && item.dayNumber > 0
              ? item.dayNumber
              : sortedDays[0]?.dayNumber || 1;

          const dayId = dayLookup.get(dayNum) || defaultDayId;

          // Strict coordinate verification: both must be valid numbers within bounds, else null
          let lat: number | null = null;
          let lng: number | null = null;

          if (
            typeof item.latitude === 'number' &&
            typeof item.longitude === 'number' &&
            !isNaN(item.latitude) &&
            !isNaN(item.longitude) &&
            item.latitude >= -90 &&
            item.latitude <= 90 &&
            item.longitude >= -180 &&
            item.longitude <= 180
          ) {
            lat = Number(item.latitude.toFixed(6));
            lng = Number(item.longitude.toFixed(6));
          }

          // Format start time if valid HH:MM, else default
          let startTime: string | null = null;
          if (
            typeof item.startTime === 'string' &&
            /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(item.startTime.trim())
          ) {
            startTime = item.startTime.trim();
          }

          return {
            id: randomUUID(),
            dayNumber: dayNum,
            itineraryDayId: dayId,
            title: String(item.title || 'Suggested Activity').slice(0, 150),
            description: item.description
              ? String(item.description).slice(0, 500)
              : null,
            location: item.location
              ? String(item.location).slice(0, 150)
              : destinationName,
            latitude: lat,
            longitude: lng,
            startTime,
            durationMinutes:
              typeof item.durationMinutes === 'number' &&
              item.durationMinutes > 0 &&
              item.durationMinutes <= 1440
                ? Math.round(item.durationMinutes)
                : 120,
            notes: item.notes ? String(item.notes).slice(0, 500) : null,
            estimatedCost:
              typeof item.estimatedCost === 'number' && item.estimatedCost >= 0
                ? Number(item.estimatedCost.toFixed(2))
                : null,
            currency: item.currency ? String(item.currency).slice(0, 10) : null,
            tags: Array.isArray(item.tags)
              ? item.tags.slice(0, 5).map((t) => String(t).slice(0, 30))
              : ['AI Suggestion'],
          };
        },
      );

      return {
        tripId: trip.id,
        destinationName,
        source: 'GEMINI',
        modelUsed: this.modelName,
        suggestions: sanitizedProposals,
        proposals: sanitizedProposals,
        summary:
          parsed.summary ||
          `AI concierge recommendations tailored for ${trip.title} in ${destinationName}.`,
        disclaimer:
          'AI-generated suggestions may include inaccurate details. Please verify hours, pricing, and availability independently.',
      };
    } catch (err: unknown) {
      const error = err as Error;
      if (abortController.signal.aborted || error.name === 'AbortError') {
        this.logger.warn(
          `Gemini request timed out after ${this.timeoutMs}ms for trip '${trip.id}'. Falling back to curated concierge.`,
        );
      } else {
        // Redact any potential key leaks in error message
        const safeMessage = (error.message || '').replace(
          /AIza[0-9A-Za-z-_]{35}/g,
          'REDACTED_API_KEY',
        );
        this.logger.warn(
          `Gemini API invocation failed (${safeMessage}). Falling back to curated concierge.`,
        );
      }

      return this.fallbackConciergeService.generateCuratedSuggestions(
        trip,
        dto,
      );
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  /**
   * Secure, atomic batch import of selected AI proposals into the itinerary.
   * Enforces trip day isolation, non-destructive coordinate validation,
   * and case-insensitive duplicate skipping on the same day.
   */
  async importProposals(
    userId: string,
    tripId: string,
    dto: ImportAiProposalsDto,
  ): Promise<ImportAiProposalsResult> {
    const { trip } = await this.tripsService.validateTripAccess(userId, tripId);

    if (!dto.proposals || dto.proposals.length === 0) {
      throw new BadRequestException('At least one proposal is required to import.');
    }

    // 1. Validate that all day IDs belong to this trip
    const validDayIds = new Set(
      (trip.itineraryDays || []).map((day) => day.id),
    );

    for (const proposal of dto.proposals) {
      if (!validDayIds.has(proposal.itineraryDayId)) {
        throw new BadRequestException(
          'One or more itinerary days do not belong to this trip.',
        );
      }

      // 2. Validate coordinates pair consistency
      const hasLat =
        proposal.latitude !== undefined && proposal.latitude !== null;
      const hasLng =
        proposal.longitude !== undefined && proposal.longitude !== null;

      if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
        throw new BadRequestException(
          'Latitude and longitude must be provided together as a coordinate pair.',
        );
      }
    }

    // 3. Deterministically sort target day IDs to prevent deadlocks across concurrent requests
    const sortedTargetDayIds = Array.from(
      new Set(dto.proposals.map((p) => p.itineraryDayId)),
    ).sort();

    // 4. Perform atomic batch creation via Prisma transaction with row-level locking
    return await this.prisma.$transaction(async (tx) => {
      // Acquire row-level locks on targeted itinerary_days rows to guarantee concurrency safety
      if (sortedTargetDayIds.length > 0) {
        await tx.$queryRaw`SELECT "id" FROM "itinerary_days" WHERE "id" IN (${Prisma.join(sortedTargetDayIds)}) FOR UPDATE`;
      }

      // Query existing activities inside the locked transaction
      const existingActivities = await tx.activity.findMany({
        where: {
          itineraryDayId: { in: sortedTargetDayIds },
        },
        select: {
          id: true,
          itineraryDayId: true,
          title: true,
          sortOrder: true,
        },
      });

      // Build tracking maps for titles and sortOrders
      const titlesByDay = new Map<string, Set<string>>();
      const maxSortOrderByDay = new Map<string, number>();

      for (const dayId of sortedTargetDayIds) {
        titlesByDay.set(dayId, new Set<string>());
        maxSortOrderByDay.set(dayId, -1);
      }

      for (const act of existingActivities) {
        const set = titlesByDay.get(act.itineraryDayId);
        if (set) {
          set.add(act.title.trim().toLowerCase());
        }
        const currentMax = maxSortOrderByDay.get(act.itineraryDayId) ?? -1;
        if (act.sortOrder > currentMax) {
          maxSortOrderByDay.set(act.itineraryDayId, act.sortOrder);
        }
      }

      const importedActivities: Activity[] = [];
      let skippedCount = 0;

      for (const proposal of dto.proposals) {
        const daySet = titlesByDay.get(proposal.itineraryDayId)!;
        const normalizedTitle = proposal.title.trim().toLowerCase();

        // Duplicate check: skip if same title already exists on this day
        if (daySet.has(normalizedTitle)) {
          skippedCount++;
          continue;
        }

        // Register title for subsequent duplicate checks in the same batch
        daySet.add(normalizedTitle);

        const currentMaxSort =
          maxSortOrderByDay.get(proposal.itineraryDayId) ?? -1;
        const nextSort = currentMaxSort + 1;
        maxSortOrderByDay.set(proposal.itineraryDayId, nextSort);

        const created = await tx.activity.create({
          data: {
            itineraryDayId: proposal.itineraryDayId,
            title: proposal.title.trim(),
            description: proposal.description?.trim() || null,
            location: proposal.location?.trim() || null,
            latitude: proposal.latitude ?? null,
            longitude: proposal.longitude ?? null,
            startTime: proposal.startTime?.trim() || null,
            durationMinutes: proposal.durationMinutes ?? 120,
            notes: proposal.notes?.trim() || null,
            sortOrder: nextSort,
            isCompleted: false,
          },
        });

        importedActivities.push(this.toActivity(created));
      }

      return {
        importedCount: importedActivities.length,
        skippedCount,
        importedActivities,
      };
    });
  }

  private toActivity(record: PrismaActivity): Activity {
    return {
      id: record.id,
      itineraryDayId: record.itineraryDayId,
      title: record.title,
      description: record.description,
      location: record.location,
      latitude: record.latitude,
      longitude: record.longitude,
      startTime: record.startTime,
      durationMinutes: record.durationMinutes,
      notes: record.notes,
      sortOrder: record.sortOrder,
      isCompleted: record.isCompleted,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
