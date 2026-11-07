'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Sparkles,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { Trip } from '@tripnest/shared';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppLayout } from '../../components/layout/AppLayout';
import { apiClient } from '../../lib/api-client';
import {
  calculateDurationDays,
  formatDateRange,
  getStatusBadge,
} from '../../lib/trip-utils';

export default function SharedWithMePage() {
  const [sharedTrips, setSharedTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSharedTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient<Trip[]>('/trips/shared');
      if (res.data) {
        setSharedTrips(res.data);
      }
    } catch (err: any) {
      console.error('Failed to load shared trips:', err);
      setError(err.message || 'Could not load shared journeys.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSharedTrips();
  }, [fetchSharedTrips]);

  return (
    <ProtectedRoute>
      <AppLayout
        pageTitle="Shared with Me"
        pageSubtitle="Collaborative itineraries and joint travel plans shared by companions"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-bg text-accent text-xs font-semibold uppercase tracking-wider mb-2">
                <Users className="w-3.5 h-3.5" />
                <span>Companion Collaboration</span>
              </div>
              <h1 className="font-semibold text-3xl sm:text-4xl text-primary-text tracking-tight">
                Shared with Me
              </h1>
              <p className="text-xs sm:text-sm text-secondary-text mt-1">
                Access trips and travel schedules where travel companions have invited you
                to collaborate.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-secondary-text">
                {sharedTrips.length}{' '}
                {sharedTrips.length === 1 ? 'shared voyage' : 'shared voyages'}
              </span>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-secondary-text mt-3">
                Fetching shared itineraries...
              </p>
            </div>
          )}

          {/* Error Banner */}
          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && sharedTrips.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-10 sm:p-16 text-center shadow-subtle">
              <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center text-accent mx-auto mb-4">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-2xl text-primary-text tracking-tight">
                No shared itineraries yet
              </h3>
              <p className="text-xs sm:text-sm text-secondary-text max-w-md mx-auto mt-2 leading-relaxed">
                When friends or companions invite you to their travel journey via an
                invitation link, the confirmed itinerary schedule, co-activities, and
                shared expense balance will appear here.
              </p>

              <div className="mt-6 flex items-center justify-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Return to Overview</span>
                </Link>
              </div>
            </div>
          )}

          {/* Shared Trips Grid */}
          {!isLoading && !error && sharedTrips.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sharedTrips.map((trip) => {
                const duration = calculateDurationDays(trip.startDate, trip.endDate);
                const badge = getStatusBadge(trip.status);
                const coverImage = trip.coverImage || trip.destination?.coverImage;
                const ownerName = trip.user?.name || 'Trip Organizer';

                return (
                  <div
                    key={trip.id}
                    className="bg-surface border border-border rounded-xl shadow-subtle hover:border-accent hover:shadow-card transition-all overflow-hidden flex flex-col justify-between group"
                  >
                    <div>
                      {/* Cover Photo */}
                      <div className="relative h-44 w-full bg-background overflow-hidden">
                        {coverImage ? (
                          <Image
                            src={coverImage}
                            alt={trip.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-accent">
                            <Compass className="w-8 h-8 opacity-40" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-primary-text/60 via-transparent to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider backdrop-blur-sm border ${badge.bg} ${badge.text} ${badge.border}`}
                          >
                            {badge.label}
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-accent/90 text-surface text-[10px] font-medium backdrop-blur-sm">
                            Co-traveler
                          </span>
                        </div>

                        {/* Bottom Tag */}
                        {trip.destination && (
                          <div className="absolute bottom-3 left-3 text-surface text-xs font-medium flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-accent" />
                            <span>
                              {trip.destination.city}, {trip.destination.country}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div className="p-5 space-y-4">
                        <div>
                          <h3 className="font-semibold text-lg text-primary-text group-hover:text-accent transition-colors line-clamp-1">
                            {trip.title}
                          </h3>
                          {trip.description && (
                            <p className="text-xs text-secondary-text mt-1 line-clamp-2 leading-relaxed">
                              {trip.description}
                            </p>
                          )}
                        </div>

                        {/* Dates & Party Info */}
                        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-secondary-text">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-accent" />
                            <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                          </div>
                          <span>{duration} Days</span>
                        </div>

                        {/* Organizer Strip */}
                        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-background border border-border text-xs">
                          <div className="w-6 h-6 rounded-full bg-accent-bg text-accent font-semibold flex items-center justify-center text-[10px] shrink-0">
                            {ownerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="truncate flex-1">
                            <span className="text-[11px] text-secondary-text block">
                              Organized by
                            </span>
                            <span className="font-medium text-primary-text truncate block">
                              {ownerName}
                            </span>
                          </div>
                          {trip.members && trip.members.length > 0 && (
                            <span className="text-[11px] text-secondary-text flex items-center gap-1 shrink-0">
                              <Users className="w-3 h-3 text-accent" />
                              <span>{trip.members.length}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Link */}
                    <div className="p-5 pt-0">
                      <Link
                        href={`/trips/${trip.id}`}
                        className="w-full py-2.5 rounded-lg bg-background hover:bg-accent hover:text-surface border border-border hover:border-accent text-primary-text text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-subtle"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Open Shared Itinerary</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
