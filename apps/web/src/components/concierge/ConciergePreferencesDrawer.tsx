'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Compass,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import {
  ConciergePreferences,
  DEFAULT_PREFERENCES,
  INTEREST_OPTIONS,
  PACING_OPTIONS,
  TRAVEL_STYLE_OPTIONS,
} from './types';
import { AiPace, AiTripTheme } from '@tripnest/shared';

interface ConciergePreferencesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (preferences: ConciergePreferences) => Promise<void>;
  isGenerating: boolean;
  initialPreferences?: ConciergePreferences;
  destinationName?: string;
  tripTitle?: string;
  dayCount?: number;
  error?: string | null;
}

export function ConciergePreferencesDrawer({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  initialPreferences = DEFAULT_PREFERENCES,
  destinationName,
  tripTitle,
  dayCount,
  error,
}: ConciergePreferencesDrawerProps) {
  const [preferences, setPreferences] =
    useState<ConciergePreferences>(initialPreferences);

  // Sync internal state when opened or initial preferences change
  useEffect(() => {
    if (isOpen) {
      setPreferences(initialPreferences);
    }
  }, [isOpen, initialPreferences]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isGenerating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isGenerating, onClose]);

  if (!isOpen) return null;

  const toggleTheme = (theme: AiTripTheme) => {
    setPreferences((prev) => {
      const exists = prev.themes.includes(theme);
      if (exists) {
        // Keep at least one theme selected
        if (prev.themes.length === 1) return prev;
        return { ...prev, themes: prev.themes.filter((t) => t !== theme) };
      }
      return { ...prev, themes: [...prev.themes, theme] };
    });
  };

  const setPace = (pace: AiPace) => {
    setPreferences((prev) => ({ ...prev, pace }));
  };

  const toggleInterest = (interest: string) => {
    setPreferences((prev) => {
      const exists = prev.interests.includes(interest);
      if (exists) {
        return {
          ...prev,
          interests: prev.interests.filter((i) => i !== interest),
        };
      }
      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  const handleCustomNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value.slice(0, 150);
    setPreferences((prev) => ({ ...prev, customNotes: val }));
  };

  const handleReset = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;
    await onGenerate(preferences);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
        onClick={() => !isGenerating && onClose()}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-lg bg-surface border-l border-border h-full shadow-lifted z-10 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-start justify-between bg-surface sticky top-0 z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-bg text-accent text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Travel Concierge</span>
            </div>
            <h2 className="text-xl font-semibold text-primary-text tracking-tight">
              Curate Your Itinerary
            </h2>
            <p className="text-xs text-secondary-text mt-1">
              Tailor suggestions for{' '}
              <span className="font-medium text-primary-text">
                {destinationName || tripTitle || 'your trip'}
              </span>
              {dayCount ? ` across ${dayCount} day${dayCount > 1 ? 's' : ''}` : ''}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 text-secondary-text hover:text-primary-text rounded-lg hover:bg-background transition-colors disabled:opacity-50"
            aria-label="Close concierge preferences"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form
          id="concierge-preferences-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6 text-sm"
        >
          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {/* Section 1: Travel Style */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                Travel Style <span className="text-accent">*</span>
              </label>
              <span className="text-[11px] text-secondary-text">Select at least one</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TRAVEL_STYLE_OPTIONS.map((style) => {
                const isSelected = preferences.themes.includes(style.id);
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => toggleTheme(style.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-accent bg-accent-bg/40 text-primary-text font-medium shadow-subtle'
                        : 'border-border bg-surface text-secondary-text hover:text-primary-text hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-primary-text">
                        {style.label}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-secondary-text line-clamp-1">
                      {style.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Pacing */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
              Pacing <span className="text-accent">*</span>
            </label>
            <div className="space-y-2">
              {PACING_OPTIONS.map((option) => {
                const isSelected = preferences.pace === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setPace(option.id)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-accent bg-accent-bg/30 text-primary-text shadow-subtle'
                        : 'border-border bg-surface text-secondary-text hover:text-primary-text hover:border-accent/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-primary-text">
                          {option.label}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-background font-medium text-secondary-text border border-border">
                          {option.activitiesPerDay}
                        </span>
                      </div>
                      <p className="text-[11px] text-secondary-text leading-relaxed">
                        {option.description}
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'border-accent bg-accent text-surface'
                          : 'border-border bg-surface'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-surface" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Interests */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                Specific Interests
              </label>
              <span className="text-[11px] text-secondary-text">Optional</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = preferences.interests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`px-3 py-1.5 rounded-lg border text-xs transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-accent bg-accent text-surface font-medium shadow-subtle'
                        : 'border-border bg-surface text-secondary-text hover:text-primary-text hover:border-accent/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-surface" />}
                    <span>{interest}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Custom Preferences */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="concierge-custom-notes"
                className="text-xs font-semibold uppercase tracking-wider text-primary-text"
              >
                Custom Requests &amp; Notes
              </label>
              <span
                className={`text-[11px] ${
                  preferences.customNotes.length >= 140
                    ? 'text-amber-600 font-semibold'
                    : 'text-secondary-text'
                }`}
              >
                {preferences.customNotes.length}/150
              </span>
            </div>
            <textarea
              id="concierge-custom-notes"
              rows={3}
              value={preferences.customNotes}
              onChange={handleCustomNotesChange}
              placeholder="e.g., prioritize scenic photo spots, prefer vegetarian dining, avoid steep climbs..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-primary-text placeholder:text-secondary-text/60 text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-none"
            />
            <p className="text-[11px] text-secondary-text leading-relaxed">
              Add any special dietary, accessibility, or specific sightseeing desires.
            </p>
          </div>

          {/* Info Banner */}
          <div className="p-3.5 rounded-xl bg-background border border-border text-xs text-secondary-text space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-primary-text">
              <Compass className="w-3.5 h-3.5 text-accent" />
              <span>Transparent Travel Recommendation Engine</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              TripNext pairs real destination highlights with thoughtful pacing. You will be able to review, adjust, and select individual proposals before anything is added to your trip.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-surface flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isGenerating}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-secondary-text hover:text-primary-text hover:bg-background border border-transparent hover:border-border transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            type="submit"
            form="concierge-preferences-form"
            disabled={isGenerating || preferences.themes.length === 0}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                <span>Generating Suggestions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Suggestions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
