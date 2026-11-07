'use client';

import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Compass,
  Globe,
  Info,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import {
  Currency,
  CURRENCY_SYMBOLS,
  DEFAULT_CURRENCY,
  Destination,
  SUPPORTED_CURRENCIES,
  Trip,
} from '@tripnest/shared';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { AppLayout } from '../../../components/layout/AppLayout';
import { apiClient } from '../../../lib/api-client';
import {
  calculateDurationDays,
  formatCurrency,
  formatDateRange,
} from '../../../lib/trip-utils';

function CreateTripContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSlug = searchParams.get('destination');

  // Form states
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [destinationsError, setDestinationsError] = useState<string | null>(null);
  const [destinationSearch, setDestinationSearch] = useState('');
  const [selectedDestination, setSelectedDestination] = useState<Destination | null>(
    null,
  );
  const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [travelerCount, setTravelerCount] = useState<number>(2);
  const [budgetAmount, setBudgetAmount] = useState<string>('');
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY as Currency);
  const [customCoverImage, setCustomCoverImage] = useState('');
  const [useCustomCover, setUseCustomCover] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close destination dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDestDropdownOpen(false);
      }
    }
    if (isDestDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDestDropdownOpen]);

  // Set default initial dates (tomorrow + 4 days)
  useEffect(() => {
    const today = new Date();
    const start = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000);

    const startFormatted = start.toISOString().split('T')[0];
    const endFormatted = end.toISOString().split('T')[0];

    setStartDate(startFormatted);
    setEndDate(endFormatted);
  }, []);

  const handleSelectDestination = useCallback((dest: Destination) => {
    setSelectedDestination(dest);
    setIsDestDropdownOpen(false);

    // Auto-fill title if empty or default
    setTitle((prev) => {
      if (!prev || prev.startsWith('Journey to ') || prev.startsWith('Escape to ')) {
        return `Journey to ${dest.city || dest.name}`;
      }
      return prev;
    });
  }, []);

  // Fetch available destinations
  const loadDestinations = useCallback(async () => {
    try {
      setLoadingDestinations(true);
      setDestinationsError(null);
      const res = await apiClient<{ items: Destination[] }>('/destinations?limit=50');
      const items = res.data?.items || [];
      setDestinations(items);

      // Handle query parameter pre-selection
      if (preselectedSlug) {
        const match = items.find(
          (d) => d.slug === preselectedSlug || d.id === preselectedSlug,
        );
        if (match) {
          handleSelectDestination(match);
        }
      }
    } catch (err: any) {
      console.error('Failed to load destinations:', err);
      setDestinationsError(err.message || 'Unable to load destinations catalog.');
    } finally {
      setLoadingDestinations(false);
    }
  }, [preselectedSlug, handleSelectDestination]);

  useEffect(() => {
    loadDestinations();
  }, [loadDestinations]);

  const filteredDestinations = useMemo(() => {
    const q = destinationSearch.trim().toLowerCase();
    if (!q) return destinations;
    return destinations.filter(
      (d) =>
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.city && d.city.toLowerCase().includes(q)) ||
        (d.country && d.country.toLowerCase().includes(q)) ||
        (d.category && d.category.toLowerCase().includes(q)),
    );
  }, [destinations, destinationSearch]);

  const durationDays = useMemo(() => {
    return calculateDurationDays(startDate, endDate);
  }, [startDate, endDate]);

  const activeCoverPhoto = useMemo(() => {
    if (useCustomCover && customCoverImage.trim()) {
      return customCoverImage.trim();
    }
    return (
      selectedDestination?.coverImage ||
      'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
    );
  }, [useCustomCover, customCoverImage, selectedDestination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedDestination) {
      setError('Please select a destination for your journey.');
      return;
    }

    if (!title.trim()) {
      setError('Please provide a title for your trip.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Please select both start and end travel dates.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }

    if (durationDays > 90) {
      setError('Trip duration cannot exceed 90 days.');
      return;
    }

    try {
      setIsSubmitting(true);

      const parsedBudget = budgetAmount.trim() ? parseFloat(budgetAmount) : undefined;

      const payload = {
        destinationId: selectedDestination.id,
        title: title.trim(),
        description: description.trim() || undefined,
        startDate,
        endDate,
        travelerCount: Number(travelerCount) || 1,
        budgetAmount: parsedBudget,
        currency,
        coverImage:
          useCustomCover && customCoverImage.trim() ? customCoverImage.trim() : undefined,
      };

      const res = await apiClient<Trip>('/trips', {
        method: 'POST',
        body: payload,
      });

      if (res.data?.id) {
        router.push(`/trips/${res.data.id}`);
      } else {
        router.push('/trips');
      }
    } catch (err: any) {
      console.error('Trip creation error:', err);
      setError(err.message || 'Failed to create trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/trips"
          className="inline-flex items-center gap-2 text-xs font-medium text-secondary-text hover:text-primary-text transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Trips</span>
        </Link>

        <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium bg-background px-2.5 py-1 rounded border border-border">
          Milestone 5 · Itinerary Canvas
        </span>
      </div>

      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-bg text-accent text-xs font-semibold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Trip Atelier</span>
        </div>
        <h1 className="font-semibold text-3xl sm:text-4.5xl text-primary-text tracking-tight">
          Curate a New Journey
        </h1>
        <p className="text-xs sm:text-sm text-secondary-text mt-1.5 max-w-2xl leading-relaxed">
          Select a verified destination, define your schedule and travel companions.
          TripNext will automatically build a bespoke day-by-day itinerary canvas for you.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in-50"
        >
          <Info className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}

      {/* Main Grid: Form (Left) & Real-time Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
          {/* Section 1: Destination Selection */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-7 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text">
                1. Select Destination <span className="text-accent">*</span>
              </label>
              {selectedDestination && (
                <button
                  type="button"
                  onClick={() => setSelectedDestination(null)}
                  className="text-xs text-secondary-text hover:text-primary-text transition-colors"
                >
                  Change
                </button>
              )}
            </div>

            {selectedDestination ? (
              <div className="flex items-center gap-4 p-3.5 rounded-lg border border-accent/30 bg-accent-bg/40">
                <div className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 border border-border">
                  <Image
                    src={selectedDestination.coverImage}
                    alt={selectedDestination.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-accent uppercase tracking-wider">
                    {selectedDestination.category}
                  </div>
                  <h4 className="font-semibold text-base text-primary-text truncate">
                    {selectedDestination.name}
                  </h4>
                  <p className="text-xs text-secondary-text flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-accent" />
                    <span>
                      {selectedDestination.city}, {selectedDestination.country}
                    </span>
                  </p>
                </div>
                <span className="p-1 rounded-full bg-accent text-surface shrink-0">
                  <Check className="w-4 h-4" />
                </span>
              </div>
            ) : (
              <div ref={dropdownRef} className="relative">
                <div
                  onClick={() => setIsDestDropdownOpen(!isDestDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-background border border-border text-left cursor-pointer hover:border-accent transition-colors"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsDestDropdownOpen(!isDestDropdownOpen);
                    }
                  }}
                >
                  <span className="text-xs sm:text-sm text-secondary-text flex items-center gap-2">
                    <Compass className="w-4 h-4 text-accent" />
                    {loadingDestinations
                      ? 'Loading destinations catalog...'
                      : destinations.length > 0
                        ? `Choose from ${destinations.length} curated destinations...`
                        : 'Choose from 24+ curated destinations...'}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-secondary-text transition-transform duration-200 ${
                      isDestDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {isDestDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-surface border border-border rounded-xl shadow-lifted p-3 max-h-80 overflow-y-auto space-y-2">
                    {/* Search Input */}
                    <div className="relative sticky top-0 bg-surface pb-2 z-10 border-b border-border">
                      <Search className="w-3.5 h-3.5 text-secondary-text absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search by city, country or destination name..."
                        value={destinationSearch}
                        onChange={(e) => setDestinationSearch(e.target.value)}
                        className="w-full pl-8 pr-8 py-1.5 text-xs bg-background border border-border rounded-md text-primary-text focus:outline-none focus:ring-1 focus:ring-accent"
                        autoFocus
                      />
                      {destinationSearch && (
                        <button
                          type="button"
                          onClick={() => setDestinationSearch('')}
                          className="absolute right-2.5 top-2 text-xs text-secondary-text hover:text-primary-text"
                          aria-label="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {loadingDestinations && (
                      <div className="flex items-center justify-center py-8 text-xs text-secondary-text gap-2">
                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span>Loading curated destinations...</span>
                      </div>
                    )}

                    {!loadingDestinations && destinationsError && (
                      <div className="text-center py-6 text-xs text-rose-700 space-y-2">
                        <p>{destinationsError}</p>
                        <button
                          type="button"
                          onClick={() => loadDestinations()}
                          className="text-accent underline font-medium hover:text-primary-text"
                        >
                          Retry loading catalog
                        </button>
                      </div>
                    )}

                    {!loadingDestinations && !destinationsError && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {filteredDestinations.map((dest) => (
                            <div
                              key={dest.id}
                              onClick={() => handleSelectDestination(dest)}
                              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-background cursor-pointer border border-transparent hover:border-border transition-colors text-left group"
                            >
                              <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 border border-border">
                                <Image
                                  src={dest.coverImage}
                                  alt={dest.name}
                                  fill
                                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-semibold text-primary-text truncate group-hover:text-accent transition-colors">
                                  {dest.name}
                                </div>
                                <div className="text-[11px] text-secondary-text truncate flex items-center gap-1 mt-0.5">
                                  <span>
                                    {dest.city}, {dest.country}
                                  </span>
                                  <span className="text-border">·</span>
                                  <span className="text-accent">{dest.category}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {filteredDestinations.length === 0 && (
                          <div className="text-center py-6 text-xs text-secondary-text">
                            {destinationSearch.trim() ? (
                              <>
                                No destinations found matching &quot;
                                {destinationSearch.trim()}&quot;.
                              </>
                            ) : (
                              <>No destinations available in the catalog.</>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Journey Identity */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-7 shadow-subtle space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text">
              2. Journey Details
            </label>

            <div>
              <label
                htmlFor="trip-title"
                className="block text-xs font-medium text-secondary-text mb-1"
              >
                Trip Title <span className="text-accent">*</span>
              </label>
              <input
                id="trip-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Autumn in Kyoto & Nara"
                maxLength={150}
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>

            <div>
              <label
                htmlFor="trip-desc"
                className="block text-xs font-medium text-secondary-text mb-1"
              >
                Description / Purpose (Optional)
              </label>
              <textarea
                id="trip-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe what you wish to experience, relax, or accomplish on this journey..."
                rows={3}
                className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent resize-none"
              />
            </div>
          </div>

          {/* Section 3: Schedule & Companions */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-7 shadow-subtle space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text">
              3. Dates &amp; Travelers
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="trip-start-date"
                  className="block text-xs font-medium text-secondary-text mb-1"
                >
                  Start Date <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <input
                    id="trip-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="trip-end-date"
                  className="block text-xs font-medium text-secondary-text mb-1"
                >
                  End Date <span className="text-accent">*</span>
                </label>
                <div className="relative">
                  <input
                    id="trip-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Duration Indicator */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border text-xs">
              <span className="text-secondary-text flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>Calculated Duration:</span>
              </span>
              <span className="font-semibold text-primary-text">
                {durationDays} {durationDays === 1 ? 'Day' : 'Days'} ({durationDays - 1}{' '}
                Nights)
              </span>
            </div>

            {/* Travelers Count */}
            <div>
              <label
                htmlFor="trip-travelers"
                className="block text-xs font-medium text-secondary-text mb-1"
              >
                Number of Travelers
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Users className="w-4 h-4 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="trip-travelers"
                    type="number"
                    min={1}
                    max={50}
                    value={travelerCount}
                    onChange={(e) =>
                      setTravelerCount(Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTravelerCount(num)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        travelerCount === num
                          ? 'bg-accent text-surface border-accent'
                          : 'bg-background border-border text-secondary-text hover:text-primary-text'
                      }`}
                    >
                      {num} {num === 1 ? 'Solo' : num === 2 ? 'Couple' : 'Family'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Budget & Currency */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-7 shadow-subtle space-y-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text">
              4. Budget &amp; Currency
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="trip-currency"
                  className="block text-xs font-medium text-secondary-text mb-1"
                >
                  Currency
                </label>
                <select
                  id="trip-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                  className="w-full px-3 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                >
                  {SUPPORTED_CURRENCIES.map((curr) => (
                    <option key={curr} value={curr}>
                      {curr} ({CURRENCY_SYMBOLS[curr]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="trip-budget"
                  className="block text-xs font-medium text-secondary-text mb-1"
                >
                  Estimated Total Budget (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-secondary-text font-medium">
                    {CURRENCY_SYMBOLS[currency]}
                  </span>
                  <input
                    id="trip-budget"
                    type="number"
                    min={0}
                    step={100}
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="e.g. 150000"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 5: Cover Photo */}
          <div className="bg-surface border border-border rounded-xl p-5 sm:p-7 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text">
                5. Cover Photography
              </label>
              <button
                type="button"
                onClick={() => setUseCustomCover(!useCustomCover)}
                className="text-xs text-accent hover:underline font-medium"
              >
                {useCustomCover ? 'Use Destination Photo' : 'Use Custom Image URL'}
              </button>
            </div>

            {useCustomCover ? (
              <div>
                <input
                  type="url"
                  value={customCoverImage}
                  onChange={(e) => setCustomCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                <p className="text-[11px] text-secondary-text mt-1">
                  Enter an Unsplash or direct image URL.
                </p>
              </div>
            ) : (
              <p className="text-xs text-secondary-text leading-relaxed">
                TripNext will automatically apply the curated high-resolution photography
                of{' '}
                <span className="font-medium text-primary-text">
                  {selectedDestination
                    ? selectedDestination.name
                    : 'the selected destination'}
                </span>
                .
              </p>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-lg bg-accent text-surface text-sm font-semibold hover:bg-accent-hover transition-colors shadow-subtle flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  <span>Generating Itinerary Canvas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Journey &amp; Build Itinerary</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Real-time Preview Column (Sticky) */}
        <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary-text">
              Live Preview
            </h3>
            <span className="text-[10px] uppercase tracking-wider text-accent font-medium bg-accent-bg px-2 py-0.5 rounded">
              Itinerary Preview
            </span>
          </div>

          {/* Preview Card */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-card">
            {/* Cover Image */}
            <div className="relative aspect-[16/10] bg-background">
              <Image
                src={activeCoverPhoto}
                alt={title || 'Trip Preview'}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-text/80 via-transparent to-transparent" />

              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-xs text-[11px] font-semibold text-primary-text border border-border/40">
                <Compass className="w-3 h-3 text-accent" />
                <span>{selectedDestination?.category || 'Curated Voyage'}</span>
              </div>

              <div className="absolute bottom-3 left-4 right-4 text-surface">
                <div className="text-xs text-surface/80 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-accent" />
                  <span>
                    {selectedDestination
                      ? `${selectedDestination.city}, ${selectedDestination.country}`
                      : 'Destination Pending'}
                  </span>
                </div>
                <h2 className="font-semibold text-xl text-surface tracking-tight mt-0.5 drop-shadow-xs line-clamp-1">
                  {title || 'Your Upcoming Voyage'}
                </h2>
              </div>
            </div>

            {/* Preview Details */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-border text-xs">
                <div>
                  <span className="text-secondary-text block text-[11px]">
                    Travel Dates
                  </span>
                  <span className="font-medium text-primary-text">
                    {formatDateRange(startDate, endDate) || 'Dates pending'}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-text block text-[11px]">Duration</span>
                  <span className="font-medium text-primary-text">
                    {durationDays} Days / {Math.max(0, durationDays - 1)} Nights
                  </span>
                </div>
                <div>
                  <span className="text-secondary-text block text-[11px]">Travelers</span>
                  <span className="font-medium text-primary-text">
                    {travelerCount} {travelerCount === 1 ? 'Traveler' : 'Travelers'}
                  </span>
                </div>
                <div>
                  <span className="text-secondary-text block text-[11px]">Budget</span>
                  <span className="font-medium text-primary-text">
                    {budgetAmount
                      ? formatCurrency(parseFloat(budgetAmount), currency)
                      : 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Automatic Canvas Generation Explainer */}
              <div className="p-3.5 rounded-lg bg-accent-bg/50 border border-accent/20 flex items-start gap-2.5 text-xs text-primary-text">
                <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold text-accent block">
                    Automatic Itinerary Generation
                  </span>
                  On creation, TripNext will initialise {durationDays} structured day
                  slots (Day 1 through Day {durationDays}) ready for your activities,
                  reservations, and stops.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewTripPage() {
  return (
    <ProtectedRoute>
      <AppLayout
        pageTitle="New Journey"
        pageSubtitle="Plan and curate your bespoke itinerary"
      >
        <Suspense
          fallback={
            <div className="max-w-6xl mx-auto px-4 py-16 text-center text-xs text-secondary-text">
              Loading journey canvas...
            </div>
          }
        >
          <CreateTripContent />
        </Suspense>
      </AppLayout>
    </ProtectedRoute>
  );
}
