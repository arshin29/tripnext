'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  CreditCard,
  Globe,
  MapPin,
  Plus,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppLayout } from '../../components/layout/AppLayout';
import { CreateTripModal } from '../../components/dashboard/CreateTripModal';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { apiClient } from '../../lib/api-client';
import { Destination, Trip } from '@tripnest/shared';
import {
  calculateDurationDays,
  formatCurrency,
  formatDateRange,
  getStatusBadge,
} from '../../lib/trip-utils';

// Fallback curated inspiration data matching seeded destinations
const FALLBACK_FEATURED = [
  {
    id: 'seed-kyoto',
    slug: 'kyoto-japan',
    name: 'Kyoto Sanctuaries & Zen Gardens',
    country: 'Japan',
    city: 'Kyoto',
    category: 'Cultural',
    bestTimeToVisit: 'Spring & Autumn',
    approximateDuration: '5-7 Days',
    coverImage:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    shortDescription:
      'Ancient wooden temples, tranquil moss rock gardens, and lantern-lit tea houses.',
    isFeatured: true,
  },
  {
    id: 'seed-amalfi',
    slug: 'amalfi-coast-italy',
    name: 'Amalfi Coast & Cliffside Terraces',
    country: 'Italy',
    city: 'Amalfi',
    category: 'Coastal',
    bestTimeToVisit: 'May to September',
    approximateDuration: '4-6 Days',
    coverImage:
      'https://images.unsplash.com/photo-1499678329028-101435549a4e?auto=format&fit=crop&w=800&q=80',
    shortDescription:
      'Pastel fishing villages clinging to rugged Mediterranean cliffs above azure waters.',
    isFeatured: true,
  },
  {
    id: 'seed-zermatt',
    slug: 'zermatt-switzerland',
    name: 'Zermatt Alpine Valleys & Matterhorn',
    country: 'Switzerland',
    city: 'Zermatt',
    category: 'Alpine',
    bestTimeToVisit: 'July to September & Dec to March',
    approximateDuration: '4-7 Days',
    coverImage:
      'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=800&q=80',
    shortDescription:
      'Car-free alpine village beneath the iconic pyramid peak of the Matterhorn.',
    isFeatured: true,
  },
  {
    id: 'seed-lofoten',
    slug: 'lofoten-islands-norway',
    name: 'Lofoten Arctic Archipelago & Fjords',
    country: 'Norway',
    city: 'Lofoten',
    category: 'Nature',
    bestTimeToVisit: 'June to August & Dec to March',
    approximateDuration: '5-7 Days',
    coverImage:
      'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=800&q=80',
    shortDescription:
      'Granite mountain spires rising vertically from pristine glassy arctic waters.',
    isFeatured: true,
  },
];

function DashboardMain() {
  const { user } = useAuth();
  const { savedCount, isSaved, toggleSave } = useWishlist();
  const [createTripOpen, setCreateTripOpen] = useState(false);
  const [featuredDestinations, setFeaturedDestinations] = useState<Destination[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [, setLoadingData] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Load featured destinations, trips, and expenses from API
  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [featRes, tripsRes, expensesRes] = await Promise.all([
          apiClient<Destination[]>('/destinations/featured'),
          apiClient<Trip[]>('/trips'),
          apiClient<{ totalExpenses?: number; totalLogged?: number }>('/expenses/overview').catch(() => ({
            data: { totalExpenses: 0, totalLogged: 0 },
          })),
        ]);

        if (featRes.data && featRes.data.length > 0) {
          setFeaturedDestinations(featRes.data.slice(0, 4));
        }
        if (tripsRes.data) {
          setTrips(tripsRes.data);
        }
        if (expensesRes.data) {
          const expData = expensesRes.data as any;
          setTotalExpenses(Number(expData.totalLogged ?? expData.totalExpenses ?? 0));
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadDashboardData();
  }, []);

  // Filter and sort trips
  const plannedTripsCount = useMemo(() => {
    return trips.filter((t) => t.status === 'UPCOMING' || t.status === 'ONGOING').length;
  }, [trips]);

  const completedTripsCount = useMemo(() => {
    return trips.filter((t) => t.status === 'COMPLETED').length;
  }, [trips]);

  const upcomingTrips = useMemo(() => {
    return trips
      .filter((t) => t.status === 'UPCOMING' || t.status === 'ONGOING')
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [trips]);

  // Next upcoming departure is the primary visual centerpiece
  const featuredTrip = upcomingTrips[0];
  const remainingUpcomingTrips = upcomingTrips.slice(1);

  // Calculate departure countdown
  const daysUntilDeparture = useMemo(() => {
    if (!featuredTrip) return null;
    const start = new Date(featuredTrip.startDate);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 0) return `${diffDays} days away`;
    if (diffDays === 0) return 'Departs today';
    return 'Active voyage';
  }, [featuredTrip]);

  // Toggle bookmark saved state
  const handleToggleSave = async (dest: any) => {
    const isNowSaved = await toggleSave(dest);
    showToast(
      isNowSaved
        ? `Saved "${dest.name}" to your wishlist`
        : `Removed "${dest.name}" from saved places`,
    );
  };

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 3000);
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  const firstName = user?.name ? user.name.split(' ')[0] : 'Traveler';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-12">
      {/* Toast Notification */}
      {feedbackMessage && (
        <div
          role="status"
          className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-50 bg-primary-text text-surface text-xs font-medium px-4 py-3 rounded-lg shadow-lifted border border-border animate-in fade-in-50 duration-150 flex items-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* =========================================================================
          1. COMPACT EDITORIAL GREETING (Directly on Canvas, No Wrapper Card)
          ========================================================================= */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium text-secondary-text mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Travel Atelier</span>
          </div>
          <h1 className="font-bold text-2xl sm:text-3xl lg:text-3.5xl text-primary-text tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-secondary-text mt-1.5 max-w-xl leading-relaxed">
            Where will your curiosity lead next? Plan your upcoming itineraries,
            coordinate journeys, or discover handpicked retreats.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCreateTripOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create a Trip</span>
          </button>

          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors shadow-subtle"
          >
            <Compass className="w-3.5 h-3.5 text-accent" />
            <span>Explore Destinations</span>
          </Link>
        </div>
      </section>

      {/* =========================================================================
          2. FEATURED UPCOMING TRIP (PRIMARY VISUAL CENTERPIECE)
          ========================================================================= */}
      <section aria-labelledby="featured-trip-heading">
        {featuredTrip ? (
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <h2
                  id="featured-trip-heading"
                  className="text-xs font-semibold uppercase tracking-wider text-secondary-text"
                >
                  Next Departure
                </h2>
              </div>
              <Link
                href="/trips"
                className="text-xs font-medium text-accent hover:underline flex items-center gap-1"
              >
                <span>View all journeys</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(() => {
              const statusBadge = getStatusBadge(featuredTrip.status);
              const duration = calculateDurationDays(
                featuredTrip.startDate,
                featuredTrip.endDate,
              );
              const totalActivities = featuredTrip.activitiesCount || 0;
              const completedActivities =
                featuredTrip.completedActivitiesCount || 0;
              const progressPct =
                totalActivities > 0
                  ? Math.round((completedActivities / totalActivities) * 100)
                  : 0;
              const coverPhoto =
                featuredTrip.coverImage || featuredTrip.destination?.coverImage;
              const destinationDisplay = featuredTrip.destination
                ? `${featuredTrip.destination.city || featuredTrip.destination.name}, ${featuredTrip.destination.country}`
                : 'Curated Voyage';

              return (
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-subtle hover:shadow-card transition-shadow duration-300">
                  <div className="grid grid-cols-1 lg:grid-cols-12">
                    {/* Destination Photography */}
                    <div className="lg:col-span-7 relative min-h-[260px] sm:min-h-[320px] lg:min-h-[380px] bg-background">
                      {coverPhoto ? (
                        <Image
                          src={coverPhoto}
                          alt={featuredTrip.title}
                          fill
                          priority
                          sizes="(max-width: 1024px) 100vw, 58vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-accent-bg/40 text-accent">
                          <Compass className="w-12 h-12 stroke-[1.5]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-primary-text/70 via-primary-text/20 to-transparent lg:hidden" />

                      {/* Floating Badges */}
                      <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-md shadow-xs ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border} border`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`}
                          />
                          {statusBadge.label}
                        </span>
                        {daysUntilDeparture && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-xs font-medium text-primary-text border border-border/60 shadow-xs">
                            <Clock className="w-3 h-3 text-accent" />
                            <span>{daysUntilDeparture}</span>
                          </span>
                        )}
                        {featuredTrip.destination?.category && (
                          <span className="px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-xs font-medium text-primary-text border border-border/60 shadow-xs">
                            {featuredTrip.destination.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Trip Details & Actions */}
                    <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{destinationDisplay}</span>
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-bold text-primary-text tracking-tight leading-snug">
                          {featuredTrip.title}
                        </h3>

                        {featuredTrip.description && (
                          <p className="text-xs sm:text-sm text-secondary-text line-clamp-2 leading-relaxed">
                            {featuredTrip.description}
                          </p>
                        )}

                        {/* Specs Strip */}
                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/80">
                          <div className="space-y-0.5">
                            <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium">
                              Dates
                            </span>
                            <p className="text-xs font-semibold text-primary-text flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span className="truncate">
                                {formatDateRange(
                                  featuredTrip.startDate,
                                  featuredTrip.endDate,
                                )}
                              </span>
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium">
                              Duration
                            </span>
                            <p className="text-xs font-semibold text-primary-text">
                              {duration} {duration === 1 ? 'day' : 'days'}
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium">
                              Travelers
                            </span>
                            <p className="text-xs font-semibold text-primary-text flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span>
                                {featuredTrip.travelerCount}{' '}
                                {featuredTrip.travelerCount === 1 ? 'guest' : 'guests'}
                              </span>
                            </p>
                          </div>
                          {featuredTrip.budgetAmount !== null && (
                            <div className="space-y-0.5">
                              <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium">
                                Budget
                              </span>
                              <p className="text-xs font-semibold text-primary-text flex items-center gap-1.5">
                                <Wallet className="w-3.5 h-3.5 text-accent shrink-0" />
                                <span>
                                  {formatCurrency(
                                    featuredTrip.budgetAmount,
                                    featuredTrip.currency || 'INR',
                                  )}
                                </span>
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Itinerary progress if activities exist */}
                        {totalActivities > 0 && (
                          <div className="space-y-1.5 pt-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-secondary-text flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                                <span>Itinerary Progress</span>
                              </span>
                              <span className="font-semibold text-primary-text">
                                {completedActivities}/{totalActivities} stops ({progressPct}%)
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border/50">
                              <div
                                className="h-full bg-accent transition-all duration-300 rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Primary Actions */}
                      <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center gap-2.5">
                        <Link
                          href={`/trips/${featuredTrip.id}/itinerary`}
                          className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle group"
                        >
                          <span>View Itinerary</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                        <Link
                          href={`/trips/${featuredTrip.id}`}
                          className="w-full sm:w-auto inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-background border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors"
                        >
                          Trip Overview
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          /* Editorial Empty State when 0 upcoming trips */
          <div className="bg-surface border border-border rounded-2xl p-8 sm:p-12 text-center shadow-subtle">
            <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center text-accent mx-auto mb-3.5">
              <Compass className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="font-semibold text-xl sm:text-2xl text-primary-text tracking-tight">
              No upcoming journeys scheduled
            </h3>
            <p className="text-xs sm:text-sm text-secondary-text max-w-md mx-auto mt-2 leading-relaxed">
              Your travel itinerary canvas is open. Begin by drafting your next voyage,
              or discover handpicked retreats crafted by our atelier.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setCreateTripOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Plan your next journey</span>
              </button>
              <Link
                href="/explore"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-background border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-accent" />
                <span>Explore destinations</span>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          3. TRAVEL STATISTICS (COMPACT HORIZONTAL STRIP)
          ========================================================================= */}
      <section
        aria-labelledby="travel-stats-heading"
        className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle"
      >
        <h2 id="travel-stats-heading" className="sr-only">
          Travel Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-border">
          {/* Stat 1: Upcoming Trips */}
          <div className="md:px-6 first:pl-0 space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary-text">
              Upcoming Trips
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-primary-text tracking-tight">
              {plannedTripsCount}
            </div>
            <p className="text-xs text-secondary-text">
              {plannedTripsCount === 1
                ? '1 active voyage'
                : `${plannedTripsCount} active voyages`}
            </p>
          </div>

          {/* Stat 2: Completed Trips */}
          <div className="md:px-6 space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary-text">
              Completed Trips
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-primary-text tracking-tight">
              {completedTripsCount}
            </div>
            <p className="text-xs text-secondary-text">
              {completedTripsCount === 1
                ? '1 past journey'
                : `${completedTripsCount} past journeys`}
            </p>
          </div>

          {/* Stat 3: Saved Places */}
          <div className="md:px-6 space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary-text">
              Saved Places
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-primary-text tracking-tight">
              {savedCount}
            </div>
            <Link
              href="/saved"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>View wishlist</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Stat 4: Travel Expenses */}
          <div className="md:px-6 last:pr-0 space-y-1">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-secondary-text">
              Travel Expenses
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-primary-text tracking-tight">
              {formatCurrency(totalExpenses, 'INR')}
            </div>
            <Link
              href="/expenses"
              className="text-xs text-accent hover:underline inline-flex items-center gap-1 font-medium"
            >
              <span>Expense ledger</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. OTHER UPCOMING JOURNEYS (IMAGE-LED GRID)
          ========================================================================= */}
      {remainingUpcomingTrips.length > 0 && (
        <section aria-labelledby="other-journeys-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="other-journeys-heading"
                className="font-semibold text-xl text-primary-text tracking-tight"
              >
                Other Scheduled Journeys
              </h2>
              <p className="text-xs text-secondary-text mt-0.5">
                Upcoming departures on your travel calendar.
              </p>
            </div>
            <Link
              href="/trips"
              className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1"
            >
              <span>View all ({trips.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingUpcomingTrips.map((trip) => {
              const statusBadge = getStatusBadge(trip.status);
              const duration = calculateDurationDays(trip.startDate, trip.endDate);
              const coverPhoto = trip.coverImage || trip.destination?.coverImage;
              const destinationDisplay = trip.destination
                ? `${trip.destination.city || trip.destination.name}, ${trip.destination.country}`
                : 'Curated Voyage';

              return (
                <div
                  key={trip.id}
                  className="bg-surface border border-border rounded-xl overflow-hidden shadow-subtle hover:shadow-card hover:border-accent/40 transition-all duration-300 flex flex-col group"
                >
                  <div className="relative aspect-[16/10] bg-background overflow-hidden">
                    {coverPhoto ? (
                      <Image
                        src={coverPhoto}
                        alt={trip.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-103 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-accent-bg/30 text-accent">
                        <Compass className="w-8 h-8 stroke-[1.5]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-primary-text/60 via-transparent to-transparent" />

                    <div className="absolute top-3 left-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-xs ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`}
                        />
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 left-3 right-3 text-surface">
                      <div className="text-[11px] font-medium text-surface flex items-center gap-1.5 drop-shadow-xs">
                        <MapPin className="w-3 h-3 text-accent shrink-0" />
                        <span className="truncate">{destinationDisplay}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <Link href={`/trips/${trip.id}`}>
                        <h3 className="font-semibold text-base text-primary-text group-hover:text-accent transition-colors line-clamp-1 tracking-tight">
                          {trip.title}
                        </h3>
                      </Link>

                      <div className="flex items-center gap-2 text-xs text-secondary-text mt-2">
                        <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="truncate">
                          {formatDateRange(trip.startDate, trip.endDate)}
                        </span>
                        <span>•</span>
                        <span className="shrink-0 font-medium text-primary-text">
                          {duration} {duration === 1 ? 'day' : 'days'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center gap-2">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle group/btn"
                      >
                        <span>View Trip</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </Link>
                      <Link
                        href={`/trips/${trip.id}/itinerary`}
                        className="py-2 px-3 rounded-lg bg-background border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors"
                      >
                        Itinerary
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================================
          5. CURATED TRAVEL INSPIRATION (EDITORIAL LOOKBOOK)
          ========================================================================= */}
      <section aria-labelledby="curated-inspiration-heading" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Editorial Selection</span>
            </div>
            <h2
              id="curated-inspiration-heading"
              className="font-semibold text-xl sm:text-2xl text-primary-text tracking-tight"
            >
              Curated Travel Inspiration
            </h2>
            <p className="text-xs text-secondary-text mt-0.5">
              Handpicked journeys and editorial guides from the TripNext travel atelier.
            </p>
          </div>

          <Link
            href="/explore"
            className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1"
          >
            <span>View all destination guides</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(featuredDestinations.length > 0
            ? featuredDestinations
            : FALLBACK_FEATURED
          ).map((dest: any) => {
            const saved = isSaved(dest.id);

            return (
              <div
                key={dest.id}
                className="bg-surface border border-border rounded-xl overflow-hidden shadow-subtle hover:shadow-card transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative aspect-[16/11] overflow-hidden bg-background">
                    <Image
                      src={dest.coverImage}
                      alt={dest.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-surface/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-semibold text-primary-text border border-border">
                      {dest.category}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSave(dest)}
                      className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-surface/90 backdrop-blur-xs flex items-center justify-center text-secondary-text hover:text-accent border border-border transition-colors cursor-pointer"
                      aria-label={saved ? 'Remove from saved' : 'Save to wishlist'}
                      title={saved ? 'Remove bookmark' : 'Save to wishlist'}
                    >
                      <Bookmark
                        className={`w-3.5 h-3.5 ${
                          saved ? 'fill-accent text-accent' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-secondary-text">
                      <span className="flex items-center gap-1 font-medium text-primary-text">
                        <MapPin className="w-3 h-3 text-accent" />
                        {dest.country}
                      </span>
                      <span>{dest.approximateDuration}</span>
                    </div>

                    <h3 className="font-semibold text-base text-primary-text leading-snug group-hover:text-accent transition-colors tracking-tight">
                      <Link href={`/destinations/${dest.slug}`}>{dest.name}</Link>
                    </h3>

                    <p className="text-xs text-secondary-text line-clamp-2 leading-relaxed">
                      {dest.shortDescription}
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 border-t border-border bg-background/30 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-secondary-text">
                    Best: {dest.bestTimeToVisit}
                  </span>
                  <Link
                    href={`/destinations/${dest.slug}`}
                    className="text-xs font-medium text-accent hover:underline inline-flex items-center gap-1"
                  >
                    <span>Read guide</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          6. SUBTLE SESSION FOOTER
          ========================================================================= */}
      <footer className="pt-6 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between text-xs text-secondary-text gap-3">
        <p>
          Signed in as{' '}
          <span className="font-medium text-primary-text">{user?.email}</span>
          {formattedDate && ` • Member since ${formattedDate}`}
        </p>

        <Link
          href="/settings"
          className="hover:text-primary-text transition-colors flex items-center gap-1"
        >
          <span>Account Settings</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </footer>

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={createTripOpen}
        onClose={() => setCreateTripOpen(false)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <AppLayout pageTitle="Overview" pageSubtitle="Your personal travel canvas">
        <DashboardMain />
      </AppLayout>
    </ProtectedRoute>
  );
}
