import {
  AiActivityProposal,
  AiConciergeResponse,
  AiPace,
  AiTripTheme,
} from '@tripnest/shared';

export interface ConciergePreferences {
  pace: AiPace;
  themes: AiTripTheme[];
  interests: string[];
  customNotes: string;
}

export interface TravelStyleOption {
  id: AiTripTheme;
  label: string;
  description: string;
}

export const TRAVEL_STYLE_OPTIONS: TravelStyleOption[] = [
  { id: 'CULTURE', label: 'Cultural', description: 'Arts, traditions, and local heritage' },
  { id: 'ADVENTURE', label: 'Adventure', description: 'Outdoor activities and thrills' },
  { id: 'FOOD', label: 'Food', description: 'Culinary highlights and local dining' },
  { id: 'RELAXATION', label: 'Relaxation', description: 'Leisurely pace and restful spots' },
  { id: 'NATURE', label: 'Nature', description: 'Parks, scenery, and natural beauty' },
  { id: 'HISTORIC', label: 'Historic', description: 'Monuments, ruins, and storied landmarks' },
];

export interface PacingOption {
  id: AiPace;
  label: string;
  activitiesPerDay: string;
  description: string;
}

export const PACING_OPTIONS: PacingOption[] = [
  {
    id: 'RELAXED',
    label: 'Relaxed',
    activitiesPerDay: '1 activity / day',
    description: 'Ample downtime, unhurried mornings, and leisurely afternoons.',
  },
  {
    id: 'BALANCED',
    label: 'Balanced',
    activitiesPerDay: '2 activities / day',
    description: 'A harmonious blend of guided sights and independent exploration.',
  },
  {
    id: 'INTENSIVE',
    label: 'Packed / Intensive',
    activitiesPerDay: '3 activities / day',
    description: 'Full-day itineraries maximizing destination highlights.',
  },
];

export const INTEREST_OPTIONS: string[] = [
  'Temples and landmarks',
  'Local markets',
  'Food experiences',
  'Photography',
  'Museums',
  'Nature',
  'Architecture',
  'Local experiences',
];

export const DEFAULT_PREFERENCES: ConciergePreferences = {
  pace: 'BALANCED',
  themes: ['CULTURE', 'FOOD'],
  interests: ['Local experiences', 'Food experiences'],
  customNotes: '',
};

export interface ConciergeReviewDraft {
  response: AiConciergeResponse | null;
  proposals: AiActivityProposal[];
  selectedIds: Set<string>;
}
