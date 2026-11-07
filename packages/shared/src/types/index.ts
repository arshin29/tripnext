export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  database?: {
    status: 'connected' | 'disconnected' | 'unreachable';
    latencyMs?: number;
    error?: string;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

export interface AuthResponseData {
  user: SafeUser;
}

export type DestinationCategory =
  'Coastal' | 'Alpine' | 'Cultural' | 'Adventure' | 'City Break' | 'Nature';

export interface Destination {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  shortDescription: string;
  detailedDescription: string;
  category: string;
  coverImage: string;
  galleryImages: string[];
  attractions: string[];
  bestTimeToVisit: string;
  approximateDuration: string;
  isFeatured: boolean;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DestinationSummary {
  id: string;
  name: string;
  slug: string;
  city: string;
  country: string;
  shortDescription: string;
  category: string;
  coverImage: string;
  bestTimeToVisit: string;
  approximateDuration: string;
  isFeatured: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SavedDestination {
  id: string;
  userId: string;
  destinationId: string;
  createdAt: string;
  destination: Destination;
}

export interface GetDestinationsQuery extends PaginationParams {
  search?: string;
  category?: string;
  featured?: boolean;
  sortBy?: 'name' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CategoryCount {
  name: string;
  count: number;
}

export type TripStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED';
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED';

export interface Activity {
  id: string;
  itineraryDayId: string;
  title: string;
  description: string | null;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startTime: string | null;
  durationMinutes: number | null;
  notes: string | null;
  sortOrder: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  date: string;
  dayNumber: number;
  title: string | null;
  notes: string | null;
  activities: Activity[];
  createdAt: string;
  updatedAt: string;
}

export type TripMemberRole = 'OWNER' | 'MEMBER';

export interface TripMember {
  id: string;
  tripId: string;
  userId: string;
  role: TripMemberRole;
  joinedAt: string;
  user?: SafeUser;
}

export interface Trip {
  id: string;
  userId: string;
  destinationId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  travelerCount: number;
  budgetAmount: number | null;
  currency: string;
  coverImage: string | null;
  status: TripStatus;
  createdAt: string;
  updatedAt: string;
  destination?: Destination;
  itineraryDays?: ItineraryDay[];
  activitiesCount?: number;
  completedActivitiesCount?: number;
  members?: TripMember[];
  currentUserRole?: TripMemberRole;
  isOwner?: boolean;
  user?: SafeUser;
}

export interface CreateTripInput {
  destinationId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  travelerCount?: number;
  budgetAmount?: number;
  currency?: string;
  coverImage?: string;
}

export interface UpdateTripInput {
  destinationId?: string;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  travelerCount?: number;
  budgetAmount?: number;
  currency?: string;
  coverImage?: string;
  status?: TripStatus;
}

export interface CreateItineraryDayInput {
  date: string;
  dayNumber: number;
  title?: string;
  notes?: string;
}

export interface UpdateItineraryDayInput {
  title?: string;
  notes?: string;
}

export interface CreateActivityInput {
  itineraryDayId: string;
  title: string;
  description?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  startTime?: string;
  durationMinutes?: number;
  notes?: string;
}

export interface UpdateActivityInput {
  title?: string;
  description?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  startTime?: string;
  durationMinutes?: number;
  notes?: string;
  isCompleted?: boolean;
}

export interface ReorderActivitiesInput {
  itineraryDayId: string;
  activityIds: string[];
}

// =========================================================================
// MILESTONE 6: COLLABORATION & INVITATIONS
// =========================================================================

export type TripInvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface TripInvitation {
  id: string;
  tripId: string;
  inviterId: string;
  email: string;
  status: TripInvitationStatus;
  expiresAt: string;
  createdAt: string;
  inviter?: SafeUser;
  trip?: Trip;
  invitationUrl?: string;
}

export interface CreateInvitationInput {
  email: string;
}

export interface InvitationDetails {
  id: string;
  tripId: string;
  inviterId: string;
  email: string;
  status: TripInvitationStatus;
  expiresAt: string;
  createdAt: string;
  inviterName: string;
  inviterEmail: string;
  tripTitle: string;
  destinationName: string;
  destinationCoverImage?: string;
  startDate: string;
  endDate: string;
}

// =========================================================================
// MILESTONE 6: ACTIVITY SUGGESTIONS & VOTING
// =========================================================================

export type ActivitySuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ActivitySuggestion {
  id: string;
  tripId: string;
  itineraryDayId: string;
  suggestedById: string;
  title: string;
  description: string | null;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startTime: string | null;
  durationMinutes: number | null;
  status: ActivitySuggestionStatus;
  createdAt: string;
  updatedAt: string;
  suggestedBy: SafeUser;
  voteCount: number;
  hasVoted: boolean;
  voters?: SafeUser[];
}

export interface CreateActivitySuggestionInput {
  itineraryDayId: string;
  title: string;
  description?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  startTime?: string;
  durationMinutes?: number;
}

export interface UpdateSuggestionStatusInput {
  status: 'APPROVED' | 'REJECTED';
}

// =========================================================================
// MILESTONE 6: SHARED EXPENSES & BALANCES
// =========================================================================

export type ExpenseCategory =
  'Accommodation' | 'Food & Drinks' | 'Transport' | 'Activities' | 'Shopping' | 'Other';

export type ExpenseSplitMethod = 'EQUAL' | 'CUSTOM';

export interface ExpenseSplitInput {
  userId: string;
  amount?: number;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  amount: number;
  user?: SafeUser;
}

export interface Expense {
  id: string;
  tripId: string;
  paidById: string;
  title: string;
  description: string | null;
  category: ExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: string;
  splitMethod: ExpenseSplitMethod;
  createdAt: string;
  updatedAt: string;
  paidBy: SafeUser;
  splits: ExpenseSplit[];
}

export interface CreateExpenseInput {
  title: string;
  description?: string;
  category: ExpenseCategory;
  amount: number;
  currency?: string;
  paidById: string;
  expenseDate: string;
  splitMethod: ExpenseSplitMethod;
  splits: ExpenseSplitInput[];
}

export interface UpdateExpenseInput {
  title?: string;
  description?: string;
  category?: ExpenseCategory;
  amount?: number;
  currency?: string;
  paidById?: string;
  expenseDate?: string;
  splitMethod?: ExpenseSplitMethod;
  splits?: ExpenseSplitInput[];
}

export interface MemberBalance {
  userId: string;
  userName: string;
  userEmail: string;
  role?: TripMemberRole;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface SettlementSuggestion {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

export interface CategoryExpenseBreakdown {
  category: ExpenseCategory;
  amount: number;
  percentage: number;
}

export interface GroupBalancesSummary {
  tripId: string;
  currency: string;
  totalTripExpenses: number;
  currentUserPaid: number;
  currentUserShare: number;
  currentUserNetBalance: number;
  members: MemberBalance[];
  settlements: SettlementSuggestion[];
  categoryBreakdown: CategoryExpenseBreakdown[];
}

// ==========================================
// AI Travel Concierge Types (Milestone 7)
// ==========================================

export type AiSuggestionSource = 'GEMINI' | 'GEMINI_AI' | 'CURATED_FALLBACK';

export type AiPace = 'RELAXED' | 'BALANCED' | 'INTENSIVE' | 'PACKED';

export type AiTripTheme =
  | 'CULTURE'
  | 'ADVENTURE'
  | 'FOOD'
  | 'RELAXATION'
  | 'NATURE'
  | 'HISTORIC';

export type AiBudgetLevel = 'BUDGET' | 'MODERATE' | 'LUXURY';

export interface GenerateAiSuggestionsInput {
  pace?: AiPace;
  pacing?: AiPace;
  themes?: AiTripTheme[];
  freeTextPrompt?: string;
  budgetLevel?: AiBudgetLevel;
}

export interface AiActivityProposal {
  id: string;
  dayNumber: number;
  itineraryDayId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startTime?: string | null;
  durationMinutes: number;
  notes?: string | null;
  estimatedCost?: number | null;
  currency?: string | null;
  tags?: string[];
}

export interface AiConciergeResponse {
  tripId: string;
  destinationName: string;
  source: AiSuggestionSource;
  modelUsed?: string | null;
  suggestions: AiActivityProposal[];
  proposals?: AiActivityProposal[];
  summary?: string | null;
  disclaimer: string;
}

export interface ImportProposalItemInput {
  itineraryDayId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startTime?: string | null;
  durationMinutes?: number;
  notes?: string | null;
}

export interface ImportAiProposalsInput {
  proposals: ImportProposalItemInput[];
}

export interface ImportAiProposalsResult {
  importedCount: number;
  skippedCount: number;
  importedActivities: Activity[];
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}
