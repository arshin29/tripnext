'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckSquare,
  Clock,
  Compass,
  DollarSign,
  Edit2,
  ExternalLink,
  Info,
  MapPin,
  MapPinOff,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
  Square,
  Tag,
  Trash2,
} from 'lucide-react';
import {
  Activity,
  AiActivityProposal,
  AiConciergeResponse,
  ItineraryDay,
  Trip,
} from '@tripnest/shared';
import { ProposalEditModal } from './ProposalEditModal';

interface ConciergeReviewWorkbenchProps {
  trip: Trip;
  itineraryDays: ItineraryDay[];
  response: AiConciergeResponse | null;
  proposals: AiActivityProposal[];
  onUpdateProposals: (proposals: AiActivityProposal[]) => void;
  onOpenPreferences: () => void;
  isGenerating: boolean;
  onImport: (selectedProposals: AiActivityProposal[]) => Promise<void>;
  isImporting: boolean;
  onBackToItinerary: () => void;
}

export function ConciergeReviewWorkbench({
  trip,
  itineraryDays,
  response,
  proposals,
  onUpdateProposals,
  onOpenPreferences,
  isGenerating,
  onImport,
  isImporting,
  onBackToItinerary,
}: ConciergeReviewWorkbenchProps) {
  // Set of selected proposal IDs for import
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Default: all proposals selected initially for fast review & import
    return new Set(proposals.map((p) => p.id));
  });

  // Filter day selector: 'ALL' or dayId
  const [activeDayFilter, setActiveDayFilter] = useState<string>('ALL');

  // Proposal being edited in modal
  const [editingProposal, setEditingProposal] =
    useState<AiActivityProposal | null>(null);

  // Build a lookup map of existing activities by dayId for duplicate detection
  const existingActivitiesByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const day of itineraryDays) {
      const set = new Set<string>();
      for (const act of day.activities || []) {
        set.add(act.title.trim().toLowerCase());
      }
      map.set(day.id, set);
    }
    return map;
  }, [itineraryDays]);

  // Group proposals by itinerary day
  const proposalsByDay = useMemo(() => {
    const groups = new Map<string, AiActivityProposal[]>();
    for (const day of itineraryDays) {
      groups.set(day.id, []);
    }

    for (const proposal of proposals) {
      const dayId = proposal.itineraryDayId || itineraryDays[0]?.id;
      if (dayId && groups.has(dayId)) {
        groups.get(dayId)!.push(proposal);
      } else if (itineraryDays.length > 0) {
        // Fallback to first day if unassigned
        groups.get(itineraryDays[0].id)!.push(proposal);
      }
    }
    return groups;
  }, [proposals, itineraryDays]);

  // Total and selected counts
  const totalCount = proposals.length;
  const selectedCount = proposals.filter((p) => selectedIds.has(p.id)).length;

  // Toggle single proposal selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all proposals across the whole workbench
  const handleSelectAll = () => {
    setSelectedIds(new Set(proposals.map((p) => p.id)));
  };

  // Deselect all proposals
  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Select all proposals for a specific day
  const handleSelectDay = (dayId: string) => {
    const dayProposals = proposalsByDay.get(dayId) || [];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of dayProposals) {
        next.add(p.id);
      }
      return next;
    });
  };

  // Deselect all proposals for a specific day
  const handleDeselectDay = (dayId: string) => {
    const dayProposals = proposalsByDay.get(dayId) || [];
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const p of dayProposals) {
        next.delete(p.id);
      }
      return next;
    });
  };

  // Remove a proposal from the draft
  const handleRemoveProposal = (id: string) => {
    const updated = proposals.filter((p) => p.id !== id);
    onUpdateProposals(updated);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Save changes from ProposalEditModal
  const handleSaveEditedProposal = (updated: AiActivityProposal) => {
    const nextProposals = proposals.map((p) => (p.id === updated.id ? updated : p));
    onUpdateProposals(nextProposals);
  };

  // Handle batch import
  const handleImportSelected = async () => {
    const selectedProposals = proposals.filter((p) => selectedIds.has(p.id));
    if (selectedProposals.length === 0 || isImporting) return;
    await onImport(selectedProposals);
  };

  const isGeminiSource =
    response?.source === 'GEMINI' || response?.source === 'GEMINI_AI';

  const destinationHint = trip.destination
    ? `${trip.destination.city}, ${trip.destination.country}`
    : trip.title;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Banner */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToItinerary}
              className="p-1.5 rounded-lg border border-border hover:bg-background text-secondary-text hover:text-primary-text transition-colors"
              title="Return to Confirmed Itinerary"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-primary-text tracking-tight">
                  AI Travel Concierge Review Workbench
                </h2>
                {isGeminiSource ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-bg text-accent border border-accent/20">
                    <Sparkles className="w-3 h-3" />
                    <span>Gemini AI {response?.modelUsed ? `(${response.modelUsed})` : ''}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <Compass className="w-3 h-3" />
                    <span>Curated Destination Guide</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary-text mt-0.5">
                Review, customize, and select activity proposals before importing them into your itinerary.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={onOpenPreferences}
              disabled={isGenerating || isImporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-surface text-xs font-medium text-primary-text hover:bg-background hover:border-accent transition-colors disabled:opacity-50"
            >
              <Sliders className="w-3.5 h-3.5 text-accent" />
              <span>Adjust Preferences</span>
            </button>

            <button
              type="button"
              onClick={onBackToItinerary}
              className="px-3.5 py-2 rounded-lg border border-border text-xs font-medium text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
            >
              Back to Timeline
            </button>
          </div>
        </div>

        {/* AI Summary / Context */}
        {response?.summary && (
          <div className="p-3.5 rounded-lg bg-background border border-border text-xs text-primary-text leading-relaxed">
            <span className="font-semibold text-accent mr-1.5">Overview:</span>
            {response.summary}
          </div>
        )}

        {/* Transparency Disclaimer */}
        {response?.disclaimer && (
          <div className="flex items-start gap-2 text-[11px] text-secondary-text pt-1">
            <Info className="w-3.5 h-3.5 text-secondary-text shrink-0 mt-0.5" />
            <span className="leading-relaxed">{response.disclaimer}</span>
          </div>
        )}
      </div>

      {/* Workbench Controls Strip */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Day Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveDayFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 ${
              activeDayFilter === 'ALL'
                ? 'bg-accent text-surface shadow-subtle'
                : 'bg-background text-secondary-text hover:text-primary-text border border-border'
            }`}
          >
            All Days ({totalCount})
          </button>
          {itineraryDays.map((day) => {
            const count = (proposalsByDay.get(day.id) || []).length;
            const isSelected = activeDayFilter === day.id;
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setActiveDayFilter(day.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-accent text-surface shadow-subtle'
                    : 'bg-background text-secondary-text hover:text-primary-text border border-border'
                }`}
              >
                <span>Day {day.dayNumber}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-surface/20 text-surface' : 'bg-surface text-secondary-text'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Global Select/Deselect Actions */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <span className="text-secondary-text">
            <strong className="text-primary-text">{selectedCount}</strong> of {totalCount} selected
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSelectAll}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-accent hover:bg-accent-bg transition-colors"
            >
              Select All
            </button>
            <span className="text-border">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-secondary-text hover:text-primary-text transition-colors"
            >
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-accent-bg text-accent mx-auto flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-semibold text-primary-text">
              No Proposals in Current Draft
            </h3>
            <p className="text-xs text-secondary-text leading-relaxed">
              Generate tailored suggestions for your trip or adjust your travel preferences.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenPreferences}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
          >
            <Sliders className="w-4 h-4" />
            <span>Open Concierge Preferences</span>
          </button>
        </div>
      )}

      {/* Proposals by Day */}
      <div className="space-y-6">
        {itineraryDays
          .filter((day) => activeDayFilter === 'ALL' || activeDayFilter === day.id)
          .map((day) => {
            const dayProposals = proposalsByDay.get(day.id) || [];
            if (dayProposals.length === 0 && activeDayFilter !== 'ALL') {
              return (
                <div
                  key={day.id}
                  className="bg-surface border border-border rounded-xl p-8 text-center text-xs text-secondary-text"
                >
                  No proposals generated for Day {day.dayNumber}.
                </div>
              );
            }
            if (dayProposals.length === 0) return null;

            const daySelectedCount = dayProposals.filter((p) =>
              selectedIds.has(p.id),
            ).length;
            const allDaySelected =
              dayProposals.length > 0 && daySelectedCount === dayProposals.length;

            return (
              <div
                key={day.id}
                className="bg-surface border border-border rounded-xl overflow-hidden shadow-subtle"
              >
                {/* Day Header */}
                <div className="p-4 sm:px-6 bg-background/50 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center text-xs font-bold text-accent shadow-subtle">
                      {day.dayNumber}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-primary-text">
                        Day {day.dayNumber}
                        {day.title ? ` — ${day.title}` : ''}
                      </h3>
                      <p className="text-[11px] text-secondary-text">
                        {day.date
                          ? new Date(day.date).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''}
                        {' · '}
                        {dayProposals.length} proposal{dayProposals.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Day Select / Deselect Controls */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-secondary-text text-[11px]">
                      {daySelectedCount} of {dayProposals.length} selected
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        allDaySelected
                          ? handleDeselectDay(day.id)
                          : handleSelectDay(day.id)
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-surface text-secondary-text hover:text-primary-text text-[11px] font-medium transition-colors"
                    >
                      {allDaySelected ? (
                        <>
                          <Square className="w-3 h-3 text-secondary-text" />
                          <span>Deselect Day</span>
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3 h-3 text-accent" />
                          <span>Select Day</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Proposal Cards List */}
                <div className="divide-y divide-border">
                  {dayProposals.map((proposal) => {
                    const isSelected = selectedIds.has(proposal.id);
                    const hasValidCoords =
                      proposal.latitude !== undefined &&
                      proposal.latitude !== null &&
                      proposal.longitude !== undefined &&
                      proposal.longitude !== null;

                    // Duplicate check against existing activities on this day
                    const dayDuplicates = existingActivitiesByDay.get(day.id);
                    const isDuplicate = dayDuplicates
                      ? dayDuplicates.has(proposal.title.trim().toLowerCase())
                      : false;

                    return (
                      <div
                        key={proposal.id}
                        className={`p-4 sm:p-5 transition-colors ${
                          isSelected ? 'bg-surface' : 'bg-background/30 opacity-75'
                        } hover:bg-surface`}
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleSelect(proposal.id)}
                            className="mt-0.5 shrink-0 focus:outline-hidden"
                            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${proposal.title}`}
                          >
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'border-accent bg-accent text-surface shadow-subtle'
                                  : 'border-border bg-surface hover:border-accent/60'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </button>

                          {/* Proposal Body */}
                          <div className="flex-1 space-y-2">
                            {/* Title & Top Badges */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h4 className="text-sm font-semibold text-primary-text">
                                    {proposal.title}
                                  </h4>

                                  {/* Coordinate Status Badge */}
                                  {hasValidCoords ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-accent-bg text-accent"
                                      title={`Verified Coordinates: ${proposal.latitude}, ${proposal.longitude}`}
                                    >
                                      <MapPin className="w-3 h-3" />
                                      <span>Map Pin</span>
                                    </span>
                                  ) : (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-background text-secondary-text border border-border"
                                      title="Coordinates omitted to avoid inaccuracies"
                                    >
                                      <MapPinOff className="w-3 h-3" />
                                      <span>No Map Pin</span>
                                    </span>
                                  )}

                                  {/* Tags */}
                                  {proposal.tags?.slice(0, 2).map((t, i) => (
                                    <span
                                      key={i}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-background text-secondary-text border border-border"
                                    >
                                      {t}
                                    </span>
                                  ))}
                                </div>

                                {/* Duplicate Warning */}
                                {isDuplicate && (
                                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium my-1">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                                    <span>
                                      Already in Day {day.dayNumber} activities. Will be automatically skipped if selected.
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Card Actions: Edit & Remove */}
                              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingProposal(proposal)}
                                  className="p-1.5 rounded-lg border border-border text-secondary-text hover:text-primary-text hover:bg-background transition-colors flex items-center gap-1 text-xs"
                                  title="Edit Proposal Details"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProposal(proposal.id)}
                                  className="p-1.5 rounded-lg border border-border text-secondary-text hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                                  title="Remove Proposal from Draft"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Description */}
                            {proposal.description && (
                              <p className="text-xs text-secondary-text leading-relaxed">
                                {proposal.description}
                              </p>
                            )}

                            {/* Meta Badges: Time, Duration, Location, Cost */}
                            <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-secondary-text pt-1">
                              {proposal.startTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-accent" />
                                  <span>{proposal.startTime}</span>
                                </div>
                              )}

                              <div className="flex items-center gap-1">
                                <span>{proposal.durationMinutes} mins</span>
                              </div>

                              {proposal.location && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5 text-secondary-text" />
                                  <span className="line-clamp-1">{proposal.location}</span>
                                </div>
                              )}

                              {/* Estimated Cost: Display ONLY when present */}
                              {proposal.estimatedCost !== undefined &&
                                proposal.estimatedCost !== null && (
                                  <div className="flex items-center gap-1 font-medium text-primary-text">
                                    <DollarSign className="w-3.5 h-3.5 text-accent" />
                                    <span>
                                      {proposal.estimatedCost.toFixed(2)}{' '}
                                      {proposal.currency || ''}
                                    </span>
                                  </div>
                                )}
                            </div>

                            {/* Travel Notes */}
                            {proposal.notes && (
                              <div className="p-2.5 rounded-lg bg-background/80 border border-border text-[11px] text-secondary-text leading-relaxed mt-2">
                                <span className="font-semibold text-primary-text mr-1">
                                  Concierge Tip:
                                </span>
                                {proposal.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>

      {/* Sticky Bottom Action Bar for Import */}
      {totalCount > 0 && (
        <div className="sticky bottom-4 z-30 bg-surface/95 backdrop-blur-md border border-border rounded-xl p-4 shadow-lifted flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-accent-bg text-accent flex items-center justify-center shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-primary-text">
                Ready to Add to Confirmed Itinerary
              </div>
              <p className="text-[11px] text-secondary-text">
                <strong className="text-accent">{selectedCount}</strong> activities selected for import.
                {selectedCount < totalCount && (
                  <span> ({totalCount - selectedCount} unselected proposals will be discarded)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={onBackToItinerary}
              disabled={isImporting}
              className="px-4 py-2.5 rounded-lg border border-border text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-background transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleImportSelected}
              disabled={selectedCount === 0 || isImporting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  <span>Importing Activities...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Import {selectedCount} Activities</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Proposal Edit Modal */}
      <ProposalEditModal
        isOpen={!!editingProposal}
        onClose={() => setEditingProposal(null)}
        proposal={editingProposal}
        itineraryDays={itineraryDays}
        onSave={handleSaveEditedProposal}
        destinationHint={destinationHint}
      />
    </div>
  );
}
