'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  Calendar,
  Clock,
  Compass,
  Globe,
  MapPin,
  Trash2,
} from 'lucide-react';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppLayout } from '../../components/layout/AppLayout';
import { useWishlist } from '../../context/WishlistContext';

export default function SavedPlacesPage() {
  const { savedDestinations, isLoading, toggleSave } = useWishlist();

  return (
    <ProtectedRoute>
      <AppLayout
        pageTitle="Saved Places"
        pageSubtitle="Your personal wishlist of handpicked destinations, stays, and scenic spots"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-bg text-accent text-xs font-semibold uppercase tracking-wider mb-2">
                <Bookmark className="w-3.5 h-3.5" />
                <span>Wishlist</span>
              </div>
              <h1 className="font-semibold text-3xl sm:text-4xl text-primary-text tracking-tight">
                Saved Places
              </h1>
              <p className="text-xs sm:text-sm text-secondary-text mt-1 max-w-xl">
                Curate a personal wishlist of future journeys, boutique accommodations,
                and scenic retreats.
              </p>
            </div>

            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-md bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle shrink-0"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Guides</span>
            </Link>
          </div>

          {/* Loading Skeleton */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="bg-surface border border-border rounded-xl overflow-hidden shadow-subtle animate-pulse"
                >
                  <div className="aspect-[16/10] bg-border/60" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-border/60 rounded w-1/3" />
                    <div className="h-6 bg-border/60 rounded w-3/4" />
                    <div className="h-3.5 bg-border/60 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && savedDestinations.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-10 sm:p-16 text-center shadow-subtle space-y-4">
              <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center text-accent mx-auto">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-2xl text-primary-text tracking-tight">
                  Your wishlist is empty
                </h3>
                <p className="text-xs sm:text-sm text-secondary-text max-w-md mx-auto mt-1.5 leading-relaxed">
                  When you discover places you love while exploring our destination guides
                  or browsing itineraries, bookmark them with the bookmark icon to keep
                  them here.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Browse curated destinations</span>
                </Link>
              </div>
            </div>
          )}

          {/* Saved Destinations Grid */}
          {!isLoading && savedDestinations.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-secondary-text">
                <span>
                  You have{' '}
                  <span className="font-semibold text-primary-text">
                    {savedDestinations.length}
                  </span>{' '}
                  {savedDestinations.length === 1 ? 'place' : 'places'} saved to your
                  wishlist
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {savedDestinations.map((item) => {
                  const dest = item.destination;

                  return (
                    <div
                      key={item.id}
                      className="bg-surface border border-border rounded-xl overflow-hidden shadow-subtle hover:shadow-card hover:border-accent/40 transition-all duration-300 group flex flex-col justify-between"
                    >
                      <div>
                        {/* Cover Image */}
                        <div className="relative aspect-[16/10] overflow-hidden bg-background">
                          <Image
                            src={dest.coverImage}
                            alt={dest.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          />

                          {/* Category Badge */}
                          <div className="absolute top-3 left-3 bg-surface/95 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-semibold text-accent border border-border shadow-xs">
                            {dest.category}
                          </div>

                          {/* Remove Bookmark Button */}
                          <button
                            type="button"
                            onClick={() => toggleSave(dest)}
                            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-surface/95 backdrop-blur-xs flex items-center justify-center text-accent hover:text-red-600 border border-border transition-colors shadow-xs"
                            title="Remove from saved places"
                            aria-label="Remove from saved places"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 space-y-2.5">
                          <div className="flex items-center justify-between text-xs text-secondary-text">
                            <span className="flex items-center gap-1 font-medium text-primary-text">
                              <MapPin className="w-3.5 h-3.5 text-accent" />
                              {dest.city}, {dest.country}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-secondary-text" />
                              {dest.approximateDuration}
                            </span>
                          </div>

                          <h2 className="font-semibold text-xl text-primary-text leading-snug group-hover:text-accent transition-colors tracking-tight">
                            <Link href={`/destinations/${dest.slug}`}>{dest.name}</Link>
                          </h2>

                          <p className="text-xs sm:text-sm text-secondary-text line-clamp-2 leading-relaxed">
                            {dest.shortDescription}
                          </p>

                          {dest.attractions && dest.attractions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {dest.attractions.slice(0, 3).map((attr, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 rounded bg-background border border-border text-secondary-text font-medium"
                                >
                                  {attr}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-5 pt-3 border-t border-border bg-background/30 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-secondary-text flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-accent" />
                          <span>{dest.bestTimeToVisit}</span>
                        </span>

                        <Link
                          href={`/destinations/${dest.slug}`}
                          className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                        >
                          <span>Explore guide</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
