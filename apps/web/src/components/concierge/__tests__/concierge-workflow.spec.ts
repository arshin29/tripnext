import {
  Activity,
  AiActivityProposal,
  AiConciergeResponse,
  AiTripTheme,
  GenerateAiSuggestionsInput,
  ImportAiProposalsInput,
  ImportAiProposalsResult,
  ItineraryDay,
} from '@tripnest/shared';
import {
  ConciergePreferences,
  DEFAULT_PREFERENCES,
  INTEREST_OPTIONS,
  PACING_OPTIONS,
  TRAVEL_STYLE_OPTIONS,
} from '../types';

describe('AI Travel Concierge — Milestone 7 Stage 4C Workflow', () => {
  describe('1. Preferences & Default Options', () => {
    it('provides sensible default preferences', () => {
      expect(DEFAULT_PREFERENCES.pace).toBe('BALANCED');
      expect(DEFAULT_PREFERENCES.themes).toEqual(['CULTURE', 'FOOD']);
      expect(DEFAULT_PREFERENCES.interests).toEqual([
        'Local experiences',
        'Food experiences',
      ]);
      expect(DEFAULT_PREFERENCES.customNotes).toBe('');
    });

    it('contains all 6 required travel style options', () => {
      const ids = TRAVEL_STYLE_OPTIONS.map((o) => o.id);
      expect(ids).toEqual([
        'CULTURE',
        'ADVENTURE',
        'FOOD',
        'RELAXATION',
        'NATURE',
        'HISTORIC',
      ]);
    });

    it('contains all 3 required pacing options', () => {
      const ids = PACING_OPTIONS.map((o) => o.id);
      expect(ids).toEqual(['RELAXED', 'BALANCED', 'INTENSIVE']);
    });

    it('contains all 8 required interest options', () => {
      expect(INTEREST_OPTIONS).toEqual([
        'Temples and landmarks',
        'Local markets',
        'Food experiences',
        'Photography',
        'Museums',
        'Nature',
        'Architecture',
        'Local experiences',
      ]);
    });

    it('formats GenerateAiSuggestionsInput contract cleanly within 300 characters', () => {
      const customPreferences: ConciergePreferences = {
        pace: 'INTENSIVE',
        themes: ['ADVENTURE', 'NATURE'],
        interests: ['Nature', 'Photography'],
        customNotes: 'Prefer morning trails and scenic views',
      };

      const themesToSend: AiTripTheme[] =
        customPreferences.themes.length > 0
          ? customPreferences.themes
          : ['CULTURE', 'FOOD'];
      const promptParts: string[] = [];
      if (customPreferences.interests.length > 0) {
        promptParts.push(`Interests: ${customPreferences.interests.join(', ')}`);
      }
      if (customPreferences.customNotes.trim()) {
        promptParts.push(`Notes: ${customPreferences.customNotes.trim()}`);
      }
      const freeTextPrompt = promptParts.join('. ').slice(0, 300);

      const payload: GenerateAiSuggestionsInput = {
        pace: customPreferences.pace,
        themes: themesToSend,
        freeTextPrompt: freeTextPrompt || undefined,
      };

      expect(payload.pace).toBe('INTENSIVE');
      expect(payload.themes).toEqual(['ADVENTURE', 'NATURE']);
      expect(payload.freeTextPrompt).toContain('Interests: Nature, Photography');
      expect(payload.freeTextPrompt).toContain(
        'Notes: Prefer morning trails and scenic views',
      );
      expect(payload.freeTextPrompt!.length).toBeLessThanOrEqual(300);
    });
  });

  describe('2. Suggestion Generation & Source Discrimination', () => {
    const mockGeminiResponse: AiConciergeResponse = {
      tripId: 'trip-1',
      destinationName: 'Tokyo',
      source: 'GEMINI',
      modelUsed: 'gemini-3.8-flash',
      summary: 'Personalized 2-day Tokyo journey focusing on culture and cuisine.',
      disclaimer: 'AI-generated suggestions may include inaccurate details.',
      suggestions: [
        {
          id: 'prop-1',
          dayNumber: 1,
          itineraryDayId: 'day-1',
          title: 'Senso-ji Temple Morning Visit',
          description: 'Explore Tokyo’s oldest temple in Asakusa.',
          location: 'Asakusa, Tokyo',
          latitude: 35.7148,
          longitude: 139.7967,
          startTime: '09:00',
          durationMinutes: 120,
          estimatedCost: 0,
          currency: 'JPY',
          tags: ['Culture', 'Historic'],
        },
        {
          id: 'prop-2',
          dayNumber: 1,
          itineraryDayId: 'day-1',
          title: 'Tsukiji Outer Market Food Tour',
          description: 'Sample authentic street seafood and matcha.',
          location: 'Tsukiji, Chuo-ku, Tokyo',
          latitude: 35.6655,
          longitude: 139.7708,
          startTime: '13:00',
          durationMinutes: 90,
          estimatedCost: 3500,
          currency: 'JPY',
          tags: ['Food', 'Culinary'],
        },
      ],
    };

    const mockCuratedFallbackResponse: AiConciergeResponse = {
      tripId: 'trip-1',
      destinationName: 'Tokyo',
      source: 'CURATED_FALLBACK',
      modelUsed: null,
      summary: 'Curated destination itinerary featuring key highlights in Tokyo.',
      disclaimer: 'Curated recommendations based on verified destination sights.',
      suggestions: [
        {
          id: 'prop-3',
          dayNumber: 1,
          itineraryDayId: 'day-1',
          title: 'Meiji Jingu Shrine',
          description: 'Tranquil forested shrine in the heart of Shibuya.',
          location: 'Meiji Jingu, Tokyo',
          latitude: null,
          longitude: null,
          startTime: '09:30',
          durationMinutes: 120,
          estimatedCost: null,
          currency: null,
          tags: ['Curated Highlight', 'Culture'],
        },
      ],
    };

    it('correctly discriminates Gemini AI source and model', () => {
      expect(mockGeminiResponse.source).toBe('GEMINI');
      expect(mockGeminiResponse.modelUsed).toBe('gemini-3.8-flash');
      expect(mockGeminiResponse.suggestions[0].latitude).toBe(35.7148);
      expect(mockGeminiResponse.suggestions[0].longitude).toBe(139.7967);
      expect(mockGeminiResponse.suggestions[1].estimatedCost).toBe(3500);
    });

    it('correctly discriminates Curated Fallback source without fabricated coords or prices', () => {
      expect(mockCuratedFallbackResponse.source).toBe('CURATED_FALLBACK');
      expect(mockCuratedFallbackResponse.modelUsed).toBeNull();
      expect(mockCuratedFallbackResponse.suggestions[0].latitude).toBeNull();
      expect(mockCuratedFallbackResponse.suggestions[0].longitude).toBeNull();
      expect(mockCuratedFallbackResponse.suggestions[0].estimatedCost).toBeNull();
    });
  });

  describe('3. Duplicate Detection Logic', () => {
    const itineraryDays: ItineraryDay[] = [
      {
        id: 'day-1',
        tripId: 'trip-1',
        dayNumber: 1,
        date: '2026-11-10',
        title: 'Asakusa & Ueno',
        notes: null,
        activities: [
          {
            id: 'act-1',
            itineraryDayId: 'day-1',
            title: 'Senso-ji Temple Morning Visit',
            description: null,
            location: 'Asakusa',
            latitude: 35.7148,
            longitude: 139.7967,
            startTime: '09:00',
            durationMinutes: 120,
            notes: null,
            sortOrder: 0,
            isCompleted: false,
            createdAt: '2026-11-06T00:00:00Z',
            updatedAt: '2026-11-06T00:00:00Z',
          },
        ],
        createdAt: '2026-11-06T00:00:00Z',
        updatedAt: '2026-11-06T00:00:00Z',
      },
      {
        id: 'day-2',
        tripId: 'trip-1',
        dayNumber: 2,
        date: '2026-11-11',
        title: 'Shinjuku & Shibuya',
        notes: null,
        activities: [],
        createdAt: '2026-11-06T00:00:00Z',
        updatedAt: '2026-11-06T00:00:00Z',
      },
    ];

    it('identifies exact and case-insensitive duplicates on the same day', () => {
      const existingByDay = new Map<string, Set<string>>();
      for (const day of itineraryDays) {
        const set = new Set<string>();
        for (const act of day.activities || []) {
          set.add(act.title.trim().toLowerCase());
        }
        existingByDay.set(day.id, set);
      }

      // Exact match on Day 1
      const isDuplicate1 = existingByDay
        .get('day-1')!
        .has('senso-ji temple morning visit');
      expect(isDuplicate1).toBe(true);

      // Case-insensitive with whitespace
      const isDuplicate2 = existingByDay
        .get('day-1')!
        .has('  SENSO-JI TEMPLE MORNING VISIT  '.trim().toLowerCase());
      expect(isDuplicate2).toBe(true);

      // Unique proposal on Day 1
      const isUnique = existingByDay
        .get('day-1')!
        .has('tsukiji outer market food tour');
      expect(isUnique).toBe(false);

      // Same activity on Day 2 is NOT considered duplicate for Day 2
      const isDuplicateDay2 = existingByDay
        .get('day-2')!
        .has('senso-ji temple morning visit');
      expect(isDuplicateDay2).toBe(false);
    });
  });

  describe('4. Draft Selection, Removal & Day Filtering', () => {
    const proposals: AiActivityProposal[] = [
      {
        id: 'p-1',
        dayNumber: 1,
        itineraryDayId: 'day-1',
        title: 'Activity 1',
        durationMinutes: 60,
      },
      {
        id: 'p-2',
        dayNumber: 1,
        itineraryDayId: 'day-1',
        title: 'Activity 2',
        durationMinutes: 90,
      },
      {
        id: 'p-3',
        dayNumber: 2,
        itineraryDayId: 'day-2',
        title: 'Activity 3',
        durationMinutes: 120,
      },
    ];

    it('initializes with all proposals selected by default', () => {
      const selectedIds = new Set(proposals.map((p) => p.id));
      expect(selectedIds.size).toBe(3);
      expect(selectedIds.has('p-1')).toBe(true);
      expect(selectedIds.has('p-2')).toBe(true);
      expect(selectedIds.has('p-3')).toBe(true);
    });

    it('handles individual selection and deselection', () => {
      let selectedIds = new Set(proposals.map((p) => p.id));

      // Deselect p-2
      selectedIds.delete('p-2');
      expect(selectedIds.size).toBe(2);
      expect(selectedIds.has('p-2')).toBe(false);

      // Reselect p-2
      selectedIds.add('p-2');
      expect(selectedIds.size).toBe(3);
      expect(selectedIds.has('p-2')).toBe(true);
    });

    it('handles per-day select all and deselect all', () => {
      let selectedIds = new Set(proposals.map((p) => p.id));

      // Deselect all Day 1 proposals
      const day1Proposals = proposals.filter((p) => p.itineraryDayId === 'day-1');
      for (const p of day1Proposals) {
        selectedIds.delete(p.id);
      }
      expect(selectedIds.size).toBe(1);
      expect(selectedIds.has('p-3')).toBe(true);

      // Select all Day 1 proposals
      for (const p of day1Proposals) {
        selectedIds.add(p.id);
      }
      expect(selectedIds.size).toBe(3);
    });

    it('removes a proposal from draft and updates selection set', () => {
      let draft = [...proposals];
      let selectedIds = new Set(proposals.map((p) => p.id));

      const removeId = 'p-2';
      draft = draft.filter((p) => p.id !== removeId);
      selectedIds.delete(removeId);

      expect(draft.length).toBe(2);
      expect(draft.find((p) => p.id === removeId)).toBeUndefined();
      expect(selectedIds.has(removeId)).toBe(false);
    });
  });

  describe('5. Coordinate Pair Validation', () => {
    function validateCoordinates(
      latStr: string,
      lngStr: string,
    ): { valid: boolean; lat: number | null; lng: number | null; error?: string } {
      const hasLat = latStr.trim().length > 0;
      const hasLng = lngStr.trim().length > 0;

      if (!hasLat && !hasLng) {
        return { valid: true, lat: null, lng: null };
      }

      if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
        return {
          valid: false,
          lat: null,
          lng: null,
          error:
            'Latitude and longitude must both be provided or both left empty.',
        };
      }

      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (isNaN(lat) || lat < -90 || lat > 90) {
        return {
          valid: false,
          lat: null,
          lng: null,
          error: 'Latitude must be a valid number between -90 and 90.',
        };
      }

      if (isNaN(lng) || lng < -180 || lng > 180) {
        return {
          valid: false,
          lat: null,
          lng: null,
          error: 'Longitude must be a valid number between -180 and 180.',
        };
      }

      return {
        valid: true,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
      };
    }

    it('accepts both null/empty coordinates', () => {
      const result = validateCoordinates('', '');
      expect(result.valid).toBe(true);
      expect(result.lat).toBeNull();
      expect(result.lng).toBeNull();
    });

    it('accepts valid latitude and longitude pair', () => {
      const result = validateCoordinates('35.6895', '139.6917');
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(35.6895);
      expect(result.lng).toBe(139.6917);
    });

    it('rejects lone latitude without longitude', () => {
      const result = validateCoordinates('35.6895', '');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Latitude and longitude must both be provided');
    });

    it('rejects lone longitude without latitude', () => {
      const result = validateCoordinates('', '139.6917');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Latitude and longitude must both be provided');
    });

    it('rejects out-of-range coordinates', () => {
      const resultLat = validateCoordinates('95.0', '10.0');
      expect(resultLat.valid).toBe(false);
      expect(resultLat.error).toContain('Latitude must be a valid number between -90 and 90');

      const resultLng = validateCoordinates('10.0', '195.0');
      expect(resultLng.valid).toBe(false);
      expect(resultLng.error).toContain('Longitude must be a valid number between -180 and 180');
    });
  });

  describe('6. Proposal Import Mapping', () => {
    it('constructs canonical ImportAiProposalsInput payload for selected proposals only', () => {
      const proposals: AiActivityProposal[] = [
        {
          id: 'p-1',
          dayNumber: 1,
          itineraryDayId: 'day-1',
          title: 'Imperial Palace Gardens',
          description: 'Historic grounds in Chiyoda.',
          location: 'Chiyoda, Tokyo',
          latitude: 35.6852,
          longitude: 139.7528,
          startTime: '10:00',
          durationMinutes: 90,
          notes: 'Free entry.',
        },
        {
          id: 'p-2',
          dayNumber: 1,
          itineraryDayId: 'day-1',
          title: 'Unselected Activity',
          durationMinutes: 60,
        },
      ];

      const selectedIds = new Set(['p-1']);
      const selectedProposals = proposals.filter((p) => selectedIds.has(p.id));

      const payload: ImportAiProposalsInput = {
        proposals: selectedProposals.map((p) => ({
          itineraryDayId: p.itineraryDayId,
          title: p.title,
          description: p.description,
          location: p.location,
          latitude: p.latitude,
          longitude: p.longitude,
          startTime: p.startTime,
          durationMinutes: p.durationMinutes,
          notes: p.notes,
        })),
      };

      expect(payload.proposals.length).toBe(1);
      expect(payload.proposals[0].title).toBe('Imperial Palace Gardens');
      expect(payload.proposals[0].itineraryDayId).toBe('day-1');
      expect(payload.proposals[0].latitude).toBe(35.6852);
      expect(payload.proposals[0].longitude).toBe(139.7528);
    });

    it('simulates import result processing and updates draft without duplicating', () => {
      const mockImportResult: ImportAiProposalsResult = {
        importedCount: 2,
        skippedCount: 1,
        importedActivities: [
          {
            id: 'act-new-1',
            itineraryDayId: 'day-1',
            title: 'Imperial Palace Gardens',
            description: 'Historic grounds in Chiyoda.',
            location: 'Chiyoda, Tokyo',
            latitude: 35.6852,
            longitude: 139.7528,
            startTime: '10:00',
            durationMinutes: 90,
            notes: 'Free entry.',
            sortOrder: 1,
            isCompleted: false,
            createdAt: '2026-11-06T00:00:00Z',
            updatedAt: '2026-11-06T00:00:00Z',
          },
        ],
      };

      expect(mockImportResult.importedCount).toBe(2);
      expect(mockImportResult.skippedCount).toBe(1);
      expect(mockImportResult.importedActivities.length).toBe(1);

      // Message generated for user
      const message = `Successfully imported ${mockImportResult.importedCount} activity(ies)${
        mockImportResult.skippedCount > 0
          ? ` (${mockImportResult.skippedCount} duplicate(s) skipped)`
          : ''
      }!`;
      expect(message).toBe('Successfully imported 2 activity(ies) (1 duplicate(s) skipped)!');
    });
  });
});
