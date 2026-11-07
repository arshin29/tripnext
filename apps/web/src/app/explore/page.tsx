'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Calendar,
  Clock,
  Compass,
  MapPin,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import {
  CategoryCount,
  DESTINATION_CATEGORIES,
  Destination,
  PaginatedResult,
} from '@tripnest/shared';
import { AppLayout } from '../../components/layout/AppLayout';
import { useWishlist } from '../../context/WishlistContext';
import { apiClient } from '../../lib/api-client';

export default function ExplorePage() {
  const { savedCount, isSaved, toggleSave } = useWishlist();

  // Search, filter, and pagination states
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'createdAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Data states
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [featuredDestinations, setFeaturedDestinations] = useState<Destination[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Fetch category counts and featured destinations once on mount
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [catRes, featRes] = await Promise.all([
          apiClient<CategoryCount[]>('/destinations/categories'),
          apiClient<Destination[]>('/destinations/featured'),
        ]);
        if (catRes.data) {
          setCategories(catRes.data);
        }
        if (featRes.data) {
          setFeaturedDestinations(featRes.data.slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load explore initial metadata:', err);
      }
    }
    loadInitialData();
  }, []);

  // Fetch paginated destinations
  const fetchDestinations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '12');

      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }

      if (selectedCategory && selectedCategory !== 'All') {
        params.set('category', selectedCategory);
      }

      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await apiClient<PaginatedResult<Destination>>(
        `/destinations?${params.toString()}`,
      );

      if (res.data) {
        setDestinations(res.data.items);
        setTotalCount(res.data.total);
        setTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch destinations:', err);
      setError('Unable to load destinations. Please verify your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedCategory, sortBy, sortOrder]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const handleToggleBookmark = async (dest: Destination) => {
    const isNowSaved = await toggleSave(dest);
    showToast(
      isNowSaved
        ? `Saved "${dest.name}" to your wishlist`
        : `Removed "${dest.name}" from saved places`,
    );
  };

  // Compute category map for fast count lookup
  const categoryCountMap = useMemo(() => {
    const map = new Map<string, number>();
    categories.forEach((c) => map.set(c.name.toLowerCase(), c.count));
    return map;
  }, [categories]);

  const allCategoryPills = ['All', ...DESTINATION_CATEGORIES.filter((c) => c !== 'All')];

  // Determine whether to show the compact seasonal inspiration spotlight
  const showSeasonalSpotlight =
    currentPage === 1 &&
    !debouncedSearch &&
    selectedCategory === 'All' &&
    featuredDestinations.length > 0;

  return (
    <AppLayout
      pageTitle="Explore Destinations"
      pageSubtitle="Curated sanctuaries, cultural capitals, and natural wonders for your next journey"
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
            1. EDITORIAL PAGE INTRODUCTION & INTEGRATED SEARCH
            ========================================================================= */}
        <section aria-labelledby="explore-heading" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium text-secondary-text mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span>Destination Atelier</span>
                <span>•</span>
                <span>Global Collection</span>
              </div>
              <h1
                id="explore-heading"
                className="font-bold text-3xl sm:text-4xl text-primary-text tracking-tight"
              >
                Find your next somewhere.
              </h1>
              <p className="text-sm text-secondary-text mt-1.5 max-w-2xl leading-relaxed">
                Handpicked sanctuaries, storied cultural capitals, and alpine retreats curated for the
                discerning traveler.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/saved"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors shadow-subtle"
              >
                <Bookmark className="w-3.5 h-3.5 text-accent" />
                <span>Wishlist ({savedCount})</span>
              </Link>
            </div>
          </div>

          {/* Compact Integrated Search Bar & Sort Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by city, country, title, or attractions..."
                className="w-full pl-10 pr-10 py-2.5 bg-surface border border-border rounded-lg text-xs sm:text-sm text-primary-text placeholder:text-secondary-text focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent shadow-subtle transition-colors"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text p-1 rounded"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Options Dropdown */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="text-xs text-secondary-text font-medium hidden sm:inline">
                Sort by:
              </span>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSort, newOrder] = e.target.value.split('-') as [
                    'createdAt' | 'name',
                    'asc' | 'desc',
                  ];
                  setSortBy(newSort);
                  setSortOrder(newOrder);
                  setCurrentPage(1);
                }}
                className="px-3.5 py-2.5 bg-surface border border-border rounded-lg text-xs font-medium text-primary-text focus:outline-none focus:border-accent shadow-subtle cursor-pointer transition-colors"
                aria-label="Sort destinations"
              >
                <option value="createdAt-desc">Curated (Newest first)</option>
                <option value="name-asc">Alphabetical (A to Z)</option>
                <option value="name-desc">Alphabetical (Z to A)</option>
                <option value="createdAt-asc">Curated (Oldest first)</option>
              </select>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {allCategoryPills.map((cat) => {
              const isSelected = selectedCategory === cat;
              const count =
                cat === 'All'
                  ? totalCount
                  : (categoryCountMap.get(cat.toLowerCase()) ?? 0);

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                    isSelected
                      ? 'bg-accent text-surface shadow-subtle'
                      : 'bg-surface border border-border text-primary-text hover:border-accent hover:text-accent shadow-subtle'
                  }`}
                >
                  <span>{cat}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        isSelected
                          ? 'bg-surface/20 text-surface'
                          : 'bg-accent-bg text-accent'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Results Summary Row */}
          <div className="flex items-center justify-between text-xs text-secondary-text pt-1">
            <div>
              {!isLoading && (
                <span>
                  Showing{' '}
                  <span className="font-semibold text-primary-text">
                    {destinations.length}
                  </span>{' '}
                  of <span className="font-semibold text-primary-text">{totalCount}</span>{' '}
                  destinations
                  {selectedCategory !== 'All' && (
                    <span>
                      {' '}
                      in{' '}
                      <span className="font-semibold text-primary-text">
                        {selectedCategory}
                      </span>
                    </span>
                  )}
                  {debouncedSearch && (
                    <span>
                      {' '}
                      matching &ldquo;
                      <span className="font-semibold text-primary-text">
                        {debouncedSearch}
                      </span>
                      &rdquo;
                    </span>
                  )}
                </span>
              )}
            </div>

            {(debouncedSearch || selectedCategory !== 'All') && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-accent hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Reset filters</span>
              </button>
            )}
          </div>
        </section>

        {/* =========================================================================
            2. OPTIONAL COMPACT SEASONAL INSPIRATION SPOTLIGHT
            ========================================================================= */}
        {showSeasonalSpotlight && (
          <section
            aria-labelledby="seasonal-curations-heading"
            className="p-6 sm:p-8 bg-surface border border-border rounded-2xl shadow-subtle space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Seasonal Spotlight</span>
                </div>
                <h2
                  id="seasonal-curations-heading"
                  className="font-semibold text-xl sm:text-2xl text-primary-text tracking-tight"
                >
                  Featured Atelier Guides
                </h2>
                <p className="text-xs text-secondary-text mt-0.5">
                  Handpicked escapes for autumn and winter retreats, verified by our curators.
                </p>
              </div>

              <div className="text-xs text-secondary-text font-medium">
                <span>Updated weekly</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featuredDestinations.map((dest) => {
                const saved = isSaved(dest.id);

                return (
                  <div
                    key={dest.id}
                    className="bg-background/40 border border-border/80 rounded-xl overflow-hidden hover:border-accent/40 transition-all group flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-[16/10] overflow-hidden bg-background">
                        <Image
                          src={dest.coverImage}
                          alt={dest.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        />
                        <div className="absolute top-2.5 left-2.5 bg-surface/90 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-semibold text-primary-text border border-border/60">
                          {dest.category}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleBookmark(dest)}
                          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-surface/90 backdrop-blur-xs flex items-center justify-center text-secondary-text hover:text-accent border border-border/60 transition-colors cursor-pointer"
                          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                          title={saved ? 'Remove bookmark' : 'Save to wishlist'}
                        >
                          <Bookmark
                            className={`w-3.5 h-3.5 ${
                              saved ? 'fill-accent text-accent' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <div className="p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-secondary-text">
                          <span className="flex items-center gap-1 font-medium text-primary-text">
                            <MapPin className="w-3 h-3 text-accent shrink-0" />
                            <span className="truncate">{dest.country}</span>
                          </span>
                          <span>{dest.approximateDuration}</span>
                        </div>

                        <h3 className="font-semibold text-sm text-primary-text leading-snug group-hover:text-accent transition-colors tracking-tight line-clamp-1">
                          <Link href={`/destinations/${dest.slug}`}>{dest.name}</Link>
                        </h3>

                        <p className="text-xs text-secondary-text line-clamp-2 leading-relaxed">
                          {dest.shortDescription}
                        </p>
                      </div>
                    </div>

                    <div className="px-3.5 py-2.5 border-t border-border/80 bg-surface/60 flex items-center justify-between text-[11px]">
                      <span className="text-secondary-text truncate max-w-[120px]">
                        {dest.bestTimeToVisit}
                      </span>
                      <Link
                        href={`/destinations/${dest.slug}`}
                        className="font-medium text-accent hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* =========================================================================
            3. ERROR STATE
            ========================================================================= */}
        {error && (
          <div className="bg-surface border border-red-200 rounded-2xl p-8 text-center space-y-3 shadow-subtle">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <button
              type="button"
              onClick={() => fetchDestinations()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            4. LOADING SKELETONS
            ========================================================================= */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="bg-surface border border-border rounded-2xl overflow-hidden shadow-subtle animate-pulse flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[16/11] bg-border/60" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-border/60 rounded w-1/3" />
                    <div className="h-6 bg-border/60 rounded w-3/4" />
                    <div className="space-y-1.5">
                      <div className="h-3.5 bg-border/60 rounded w-full" />
                      <div className="h-3.5 bg-border/60 rounded w-5/6" />
                    </div>
                  </div>
                </div>
                <div className="p-5 pt-0">
                  <div className="h-8 bg-border/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* =========================================================================
            5. EMPTY STATE
            ========================================================================= */}
        {!isLoading && !error && destinations.length === 0 && (
          <div className="bg-surface border border-border rounded-2xl p-10 sm:p-16 text-center shadow-subtle space-y-4">
            <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center text-accent mx-auto">
              <Compass className="w-6 h-6 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="font-semibold text-xl sm:text-2xl text-primary-text tracking-tight">
                No destinations found
              </h3>
              <p className="text-xs sm:text-sm text-secondary-text max-w-md mx-auto mt-1 leading-relaxed">
                We couldn&rsquo;t find any destinations matching your current query. Try adjusting
                your search terms or resetting the category filter.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset all filters</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            6. MAIN DESTINATION GRID (16:11 Image Ratio, Editorial Cards)
            ========================================================================= */}
        {!isLoading && !error && destinations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {destinations.map((dest) => {
              const saved = isSaved(dest.id);

              return (
                <div
                  key={dest.id}
                  className="bg-surface border border-border rounded-2xl overflow-hidden shadow-subtle hover:shadow-card hover:border-accent/40 transition-all duration-300 group flex flex-col justify-between"
                >
                  <div>
                    {/* Cover Photography (16:11 Aspect Ratio) */}
                    <div className="relative aspect-[16/11] overflow-hidden bg-background">
                      <Image
                        src={dest.coverImage}
                        alt={dest.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-primary-text/40 via-transparent to-transparent opacity-60" />

                      {/* Category Badge */}
                      <div className="absolute top-3 left-3 bg-surface/90 backdrop-blur-md px-2.5 py-1 rounded text-[11px] font-semibold text-primary-text border border-border/60 shadow-xs">
                        {dest.category}
                      </div>

                      {/* Wishlist Bookmark Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleToggleBookmark(dest);
                        }}
                        className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-surface/90 backdrop-blur-md flex items-center justify-center border border-border/60 transition-all shadow-xs hover:border-accent hover:text-accent cursor-pointer ${
                          saved
                            ? 'text-accent border-accent/40'
                            : 'text-secondary-text hover:text-accent'
                        }`}
                        aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                        title={saved ? 'Remove bookmark' : 'Save to wishlist'}
                      >
                        <Bookmark
                          className={`w-3.5 h-3.5 transition-colors ${
                            saved ? 'fill-accent text-accent' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 space-y-2.5">
                      {/* Location & Duration Strip */}
                      <div className="flex items-center justify-between text-xs text-secondary-text">
                        <span className="flex items-center gap-1 font-medium text-primary-text truncate max-w-[65%]">
                          <MapPin className="w-3.5 h-3.5 text-accent shrink-0" />
                          <span className="truncate">
                            {dest.city ? `${dest.city}, ${dest.country}` : dest.country}
                          </span>
                        </span>
                        <span className="flex items-center gap-1 shrink-0 text-[11px]">
                          <Clock className="w-3 h-3 text-secondary-text" />
                          <span>{dest.approximateDuration}</span>
                        </span>
                      </div>

                      {/* Destination Title */}
                      <h2 className="font-semibold text-base sm:text-lg text-primary-text leading-snug group-hover:text-accent transition-colors tracking-tight line-clamp-1">
                        <Link href={`/destinations/${dest.slug}`}>{dest.name}</Link>
                      </h2>

                      {/* Short Description */}
                      <p className="text-xs text-secondary-text line-clamp-2 leading-relaxed">
                        {dest.shortDescription}
                      </p>

                      {/* Key Attractions Preview Tags */}
                      {dest.attractions && dest.attractions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {dest.attractions.slice(0, 2).map((attr, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-2 py-0.5 rounded bg-background border border-border text-secondary-text font-medium truncate max-w-[130px]"
                            >
                              {attr}
                            </span>
                          ))}
                          {dest.attractions.length > 2 && (
                            <span className="text-[10px] px-1.5 py-0.5 text-secondary-text font-medium">
                              +{dest.attractions.length - 2} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 border-t border-border bg-background/30 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-secondary-text flex items-center gap-1 truncate max-w-[170px]">
                      <Calendar className="w-3 h-3 text-accent shrink-0" />
                      <span className="truncate">{dest.bestTimeToVisit}</span>
                    </span>

                    <Link
                      href={`/destinations/${dest.slug}`}
                      className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1 shrink-0"
                    >
                      <span>Explore guide</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================================================
            7. PAGINATION CONTROLS
            ========================================================================= */}
        {!isLoading && totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4"
          >
            <div className="text-xs text-secondary-text">
              Showing page <span className="font-semibold text-primary-text">{currentPage}</span> of{' '}
              <span className="font-semibold text-primary-text">{totalPages}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface border border-border text-xs font-medium text-primary-text hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-subtle cursor-pointer"
                aria-label="Previous page"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setCurrentPage(pageNumber)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      pageNumber === currentPage
                        ? 'bg-accent text-surface shadow-subtle'
                        : 'bg-surface border border-border text-primary-text hover:border-accent hover:text-accent'
                    }`}
                    aria-label={`Page ${pageNumber}`}
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface border border-border text-xs font-medium text-primary-text hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-subtle cursor-pointer"
                aria-label="Next page"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </nav>
        )}
      </div>
    </AppLayout>
  );
}
