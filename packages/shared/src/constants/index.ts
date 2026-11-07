export const APP_NAME = 'TripNext';
export const APP_TAGLINE = 'Every journey, thoughtfully planned.';
export const APP_DESCRIPTION =
  'A premium travel planning and collaboration platform for curating journeys, managing itineraries, and coordinating with travel companions.';

export const API_GLOBAL_PREFIX = 'api';
export const DEFAULT_API_PORT = 4000;
export const DEFAULT_WEB_PORT = 3000;

export const PALETTE = {
  background: '#F7F5F0',
  surface: '#FFFFFF',
  primaryText: '#252A25',
  secondaryText: '#85877F',
  accent: '#66836B',
  accentBg: '#EAF0E9',
  border: '#E9E7E0',
} as const;

export const AUTH_COOKIE_NAME = 'tripnest_session';
export const AUTH_TOKEN_EXPIRY = '7d';
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const CSRF_HEADER_NAME = 'x-tripnest-csrf';

export const DESTINATION_CATEGORIES = [
  'All',
  'Coastal',
  'Alpine',
  'Cultural',
  'Adventure',
  'City Break',
  'Nature',
] as const;

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'] as const;
export const DEFAULT_CURRENCY = 'INR';

export const TRIP_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED'] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
};

export const TRIP_MEMBER_ROLES = ['OWNER', 'MEMBER'] as const;

export const INVITATION_STATUSES = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
] as const;

export const INVITATION_EXPIRY_DAYS = 7;

export const SUGGESTION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;

export const EXPENSE_CATEGORIES = [
  'Accommodation',
  'Food & Drinks',
  'Transport',
  'Activities',
  'Shopping',
  'Other',
] as const;

export const EXPENSE_SPLIT_METHODS = ['EQUAL', 'CUSTOM'] as const;
