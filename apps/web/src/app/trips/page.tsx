'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Map,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Trip } from '@tripnest/shared';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppLayout } from '../../components/layout/AppLayout';
import { apiClient } from '../../lib/api-client';
import {
  calculateDurationDays,
  formatCurrency,
  formatDateRange,
  getStatusBadge,
} from '../../lib/trip-utils';

type FilterTab = 'ALL' | 'UPCOMING' | 'ONGOING' | 'COMPLETED';

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete modal state
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<Trip[]>('/trips');
      setTrips(res.data || []);
    } catch (err) {
      console.error('Failed to fetch trips:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteTrip = async () => {
    if (!tripToDelete) return;

    try {
      setIsDeleting(true);
      await apiClient(`/trips/${tripToDelete.id}`, { method: 'DELETE' });
      setTrips((prev) => prev.filter((t) => t.id !== tripToDelete.id));
      showToast(`Journey "${tripToDelete.title}" was deleted.`);
      setTripToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete trip:', err);
      showToast(err.message || 'Failed to delete trip.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Counts for each tab
  const tabCounts = useMemo(() => {
    return {
      ALL: trips.length,
      UPCOMING: trips.filter((t) => t.status === 'UPCOMING').length,
      ONGOING: trips.filter((t) => t.status === 'ONGOING').length,
      COMPLETED: trips.filter((t) => t.status === 'COMPLETED').length,
    };
  }, [trips]);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      // Status match
      if (activeTab !== 'ALL' && trip.status !== activeTab) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = trip.title.toLowerCase().includes(q);
        const matchesCity = trip.destination?.city?.toLowerCase().includes(q);
        const matchesCountry = trip.destination?.country?.toLowerCase().includes(q);
        return matchesTitle || matchesCity || matchesCountry;
      }
      return true;
    });
  }, [trips, activeTab, searchQuery]);

  return (
    <ProtectedRoute>
      <AppLayout
        pageTitle="My Journeys"
        pageSubtitle="All upcoming, ongoing, and completed travel itineraries"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-10">
          {/* Toast Notification */}
          {toastMessage && (
            <div
              role="status"
              className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-50 bg-primary-text text-surface text-xs font-medium px-4 py-3 rounded-lg shadow-lifted border border-border animate-in fade-in-50 duration-150 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* =========================================================================
              1. EDITORIAL HEADER & ACTION
              ========================================================================= */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-secondary-text mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span>Travel Atelier</span>
                <span>•</span>
                <span>Personal Itineraries</span>
              </div>
              <h1 className="font-bold text-3xl sm:text-4xl text-primary-text tracking-tight">
                My Journeys
              </h1>
              <p className="text-sm text-secondary-text mt-1.5 max-w-2xl leading-relaxed">
                Manage, schedule, and navigate your day-by-day travel itineraries, reservations, and companion circles.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/trips/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
              >
                <Plus className="w-4 h-4" />
                <span>Plan a Journey</span>
              </Link>
            </div>
          </section>

          {/* =========================================================================
              2. INTEGRATED FILTER TABS & SEARCH
              ========================================================================= */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {(
                  [
                    { id: 'ALL', label: 'All Journeys' },
                    { id: 'UPCOMING', label: 'Upcoming' },
                    { id: 'ONGOING', label: 'Ongoing' },
                    { id: 'COMPLETED', label: 'Completed' },
                  ] as const
                ).map((tab) => {
                  const isSelected = activeTab === tab.id;
                  const count = tabCounts[tab.id];

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                        isSelected
                          ? 'bg-accent text-surface shadow-subtle'
                          : 'bg-surface border border-border text-primary-text hover:border-accent hover:text-accent shadow-subtle'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          isSelected
                            ? 'bg-surface/20 text-surface'
                            : 'bg-accent-bg text-accent'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Quick Search */}
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by title or destination..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm bg-surface border border-border rounded-lg text-primary-text placeholder:text-secondary-text focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent shadow-subtle transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text p-1 rounded"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Active Query Status */}
            {(searchQuery.trim() || activeTab !== 'ALL') && (
              <div className="flex items-center justify-between text-xs text-secondary-text pt-1">
                <span>
                  Showing{' '}
                  <span className="font-semibold text-primary-text">
                    {filteredTrips.length}
                  </span>{' '}
                  of <span className="font-semibold text-primary-text">{trips.length}</span>{' '}
                  journeys
                  {activeTab !== 'ALL' && (
                    <span>
                      {' '}
                      in{' '}
                      <span className="font-semibold text-primary-text">
                        {activeTab.toLowerCase()}
                      </span>
                    </span>
                  )}
                  {searchQuery && (
                    <span>
                      {' '}
                      matching &ldquo;
                      <span className="font-semibold text-primary-text">
                        {searchQuery}
                      </span>
                      &rdquo;
                    </span>
                  )}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ALL');
                    setSearchQuery('');
                  }}
                  className="text-accent hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Reset filters</span>
                </button>
              </div>
            )}
          </section>

          {/* =========================================================================
              3. LOADING SKELETONS
              ========================================================================= */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-surface border border-border rounded-2xl overflow-hidden shadow-subtle animate-pulse flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/10] bg-border/60" />
                    <div className="p-6 space-y-3">
                      <div className="h-4 bg-border/60 rounded w-1/3" />
                      <div className="h-6 bg-border/60 rounded w-3/4" />
                      <div className="space-y-1.5 pt-2">
                        <div className="h-3.5 bg-border/60 rounded w-full" />
                        <div className="h-3.5 bg-border/60 rounded w-5/6" />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="h-9 bg-border/40 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* =========================================================================
              4. EMPTY STATE: NO TRIPS CREATED
              ========================================================================= */}
          {!isLoading && trips.length === 0 && (
            <div className="bg-surface border border-border rounded-2xl p-10 sm:p-16 text-center max-w-2xl mx-auto shadow-subtle space-y-5">
              <div className="w-14 h-14 rounded-full bg-accent-bg text-accent mx-auto flex items-center justify-center">
                <Compass className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-2xl text-primary-text tracking-tight">
                  Your Passport Canvas is Open
                </h3>
                <p className="text-xs sm:text-sm text-secondary-text max-w-md mx-auto leading-relaxed">
                  You haven&apos;t scheduled any travel itineraries yet. Plan your next unforgettable
                  retreat with day-by-day activities, reservations, and destination guides.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/trips/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start Your First Journey</span>
                </Link>
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-background border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors"
                >
                  <Compass className="w-4 h-4 text-accent" />
                  <span>Explore 24+ Verified Escapes</span>
                </Link>
              </div>
            </div>
          )}

          {/* =========================================================================
              5. EMPTY STATE: NO RESULTS FOR CURRENT FILTER/SEARCH
              ========================================================================= */}
          {!isLoading && trips.length > 0 && filteredTrips.length === 0 && (
            <div className="bg-surface border border-border rounded-2xl p-10 sm:p-14 text-center max-w-md mx-auto space-y-4 shadow-subtle">
              <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center text-accent mx-auto">
                <Search className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-primary-text">No Matching Journeys</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  No itineraries match your current filter or search criteria.
                </p>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('ALL');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle cursor-pointer"
                >
                  <span>Reset filters and view all</span>
                </button>
              </div>
            </div>
          )}

          {/* =========================================================================
              6. SINGLE TRIP HERO CENTERPIECE (Balanced width for 1 trip)
              ========================================================================= */}
          {!isLoading && filteredTrips.length === 1 && !searchQuery && activeTab === 'ALL' && (
            (() => {
              const trip = filteredTrips[0];
              const statusBadge = getStatusBadge(trip.status);
              const duration = calculateDurationDays(trip.startDate, trip.endDate);
              const totalActivities = trip.activitiesCount || 0;
              const completedActivities = trip.completedActivitiesCount || 0;
              const progressPct =
                totalActivities > 0
                  ? Math.round((completedActivities / totalActivities) * 100)
                  : 0;
              const coverPhoto = trip.coverImage || trip.destination?.coverImage;
              const destinationDisplay = trip.destination
                ? `${trip.destination.city || trip.destination.name}, ${trip.destination.country}`
                : 'Curated Voyage';

              return (
                <div className="space-y-6">
                  <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-subtle hover:shadow-card transition-shadow duration-300">
                    <div className="grid grid-cols-1 lg:grid-cols-12">
                      {/* Image Panel */}
                      <div className="lg:col-span-7 relative min-h-[280px] sm:min-h-[340px] lg:min-h-[400px] bg-background">
                        {coverPhoto ? (
                          <Image
                            src={coverPhoto}
                            alt={trip.title}
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
                          {trip.destination?.category && (
                            <span className="px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-md text-xs font-medium text-primary-text border border-border/60 shadow-xs">
                              {trip.destination.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Panel */}
                      <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                        <div className="space-y-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span>{destinationDisplay}</span>
                          </div>

                          <h2 className="text-2xl sm:text-3xl font-bold text-primary-text tracking-tight leading-snug">
                            {trip.title}
                          </h2>

                          {trip.description && (
                            <p className="text-xs sm:text-sm text-secondary-text line-clamp-2 leading-relaxed">
                              {trip.description}
                            </p>
                          )}

                          {/* Specs Grid */}
                          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/80">
                            <div className="space-y-0.5">
                              <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium">
                                Dates
                              </span>
                              <p className="text-xs font-semibold text-primary-text flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                                <span className="truncate">
                                  {formatDateRange(trip.startDate, trip.endDate)}
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
                                  {trip.travelerCount}{' '}
                                  {trip.travelerCount === 1 ? 'guest' : 'guests'}
                                </span>
                              </p>
                            </div>
                            {trip.budgetAmount !== null && (
                              <div className="space-y-0.5">
                                <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium">
                                  Budget
                                </span>
                                <p className="text-xs font-semibold text-primary-text flex items-center gap-1.5">
                                  <Wallet className="w-3.5 h-3.5 text-accent shrink-0" />
                                  <span>
                                    {formatCurrency(trip.budgetAmount, trip.currency || 'INR')}
                                  </span>
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Itinerary progress */}
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
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-border flex items-center gap-2.5">
                          <Link
                            href={`/trips/${trip.id}/itinerary`}
                            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle group"
                          >
                            <span>Open Itinerary Planner</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </Link>
                          <Link
                            href={`/trips/${trip.id}`}
                            className="inline-flex items-center justify-center py-2.5 px-4 rounded-lg bg-background border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors"
                          >
                            Trip Overview
                          </Link>
                          <button
                            type="button"
                            onClick={() => setTripToDelete(trip)}
                            aria-label={`Delete ${trip.title}`}
                            className="p-2.5 rounded-lg text-secondary-text hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                            title="Delete journey"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Curated Invitation below the single trip */}
                  <div className="p-6 sm:p-8 bg-surface border border-border rounded-2xl shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base sm:text-lg text-primary-text tracking-tight">
                        Looking to expand your travel calendar?
                      </h3>
                      <p className="text-xs sm:text-sm text-secondary-text max-w-xl">
                        Discover 24+ verified international sanctuaries in our destination atelier or begin curating your next journey.
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <Link
                        href="/explore"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors shadow-subtle"
                      >
                        <Compass className="w-3.5 h-3.5 text-accent" />
                        <span>Explore Destinations</span>
                      </Link>
                      <Link
                        href="/trips/new"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Curate Next Journey</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()
          )}

          {/* =========================================================================
              7. TRIPS GRID (When > 1 trip exists or during search/filters)
              ========================================================================= */}
          {!isLoading &&
            filteredTrips.length > 0 &&
            !(filteredTrips.length === 1 && !searchQuery && activeTab === 'ALL') && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTrips.map((trip) => {
                  const statusBadge = getStatusBadge(trip.status);
                  const duration = calculateDurationDays(trip.startDate, trip.endDate);
                  const totalActivities = trip.activitiesCount || 0;
                  const completedActivities = trip.completedActivitiesCount || 0;
                  const progressPct =
                    totalActivities > 0
                      ? Math.round((completedActivities / totalActivities) * 100)
                      : 0;

                  const coverPhoto = trip.coverImage || trip.destination?.coverImage;
                  const destinationDisplay = trip.destination
                    ? `${trip.destination.city || trip.destination.name}, ${trip.destination.country}`
                    : 'Curated Voyage';

                  return (
                    <div
                      key={trip.id}
                      className="bg-surface border border-border rounded-2xl overflow-hidden shadow-subtle hover:shadow-card hover:border-accent/40 transition-all duration-300 flex flex-col justify-between group"
                    >
                      <div>
                        {/* Cover Image Container */}
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
                          <div className="absolute inset-0 bg-gradient-to-t from-primary-text/70 via-transparent to-transparent" />

                          {/* Floating Status & Category Badges */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border backdrop-blur-xs ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`}
                              />
                              {statusBadge.label}
                            </span>

                            {trip.destination?.category && (
                              <span className="px-2.5 py-0.5 rounded-full bg-surface/90 backdrop-blur-xs text-[10px] font-semibold text-primary-text border border-border/40 shadow-xs">
                                {trip.destination.category}
                              </span>
                            )}
                          </div>

                          {/* Destination pill on image */}
                          <div className="absolute bottom-3 left-3 right-3 text-surface">
                            <div className="text-[11px] font-medium text-surface flex items-center gap-1.5 drop-shadow-xs">
                              <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                              <span className="truncate">{destinationDisplay}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 space-y-4">
                          <div>
                            <Link href={`/trips/${trip.id}`}>
                              <h3 className="font-semibold text-lg text-primary-text group-hover:text-accent transition-colors line-clamp-1 tracking-tight">
                                {trip.title}
                              </h3>
                            </Link>

                            {/* Schedule & Duration */}
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

                            {/* Travelers & INR Budget */}
                            <div className="flex items-center justify-between text-xs text-secondary-text mt-3 pt-3 border-t border-border">
                              <div className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-accent" />
                                <span>
                                  {trip.travelerCount}{' '}
                                  {trip.travelerCount === 1 ? 'guest' : 'guests'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 font-semibold text-primary-text">
                                <Wallet className="w-3.5 h-3.5 text-accent" />
                                <span>
                                  {formatCurrency(trip.budgetAmount, trip.currency || 'INR')}
                                </span>
                              </div>
                            </div>

                            {/* Activity Completion Progress Bar */}
                            <div className="mt-3.5 pt-3 border-t border-border space-y-1.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="text-secondary-text flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-accent" />
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
                          </div>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="p-5 pt-3 border-t border-border bg-background/20 flex items-center gap-2">
                        <Link
                          href={`/trips/${trip.id}/itinerary`}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle group/btn"
                        >
                          <span>Itinerary</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Link>
                        <Link
                          href={`/trips/${trip.id}`}
                          className="py-2 px-3 rounded-lg bg-surface border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors shadow-subtle"
                        >
                          Overview
                        </Link>
                        <button
                          type="button"
                          onClick={() => setTripToDelete(trip)}
                          aria-label={`Delete ${trip.title}`}
                          className="p-2 rounded-lg text-secondary-text hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                          title="Delete journey"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          {/* =========================================================================
              8. DELETE CONFIRMATION MODAL
              ========================================================================= */}
          {tripToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
                onClick={() => !isDeleting && setTripToDelete(null)}
              />
              <div className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-lifted p-6 sm:p-7 z-10 space-y-4 animate-in fade-in-50 zoom-in-95">
                <div className="w-11 h-11 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-primary-text tracking-tight">
                    Delete Journey
                  </h3>
                  <p className="text-xs sm:text-sm text-secondary-text mt-1.5 leading-relaxed">
                    Are you sure you want to permanently delete &quot;{tripToDelete.title}&quot;? All associated day itineraries, activities, and split records will be removed.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setTripToDelete(null)}
                    className="px-4 py-2 rounded-lg text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteTrip}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-surface bg-rose-600 hover:bg-rose-700 transition-colors shadow-subtle flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
