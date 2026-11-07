'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Clock,
  Compass,
  DollarSign,
  FileText,
  MapPin,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { AiActivityProposal, ItineraryDay } from '@tripnest/shared';
import { searchCoordinates, GeocodeResult } from '../../lib/geocoding';

interface ProposalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: AiActivityProposal | null;
  itineraryDays: ItineraryDay[];
  onSave: (updated: AiActivityProposal) => void;
  destinationHint?: string;
}

export function ProposalEditModal({
  isOpen,
  onClose,
  proposal,
  itineraryDays,
  onSave,
  destinationHint,
}: ProposalEditModalProps) {
  const [title, setTitle] = useState('');
  const [selectedDayId, setSelectedDayId] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('120');
  const [notes, setNotes] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [currency, setCurrency] = useState('');

  // Geocoding state
  const [isSearchingCoords, setIsSearchingCoords] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [coordError, setCoordError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync state when proposal changes
  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title || '');
      setSelectedDayId(proposal.itineraryDayId || itineraryDays[0]?.id || '');
      setDescription(proposal.description || '');
      setLocation(proposal.location || '');
      setLatitude(
        proposal.latitude !== undefined && proposal.latitude !== null
          ? String(proposal.latitude)
          : '',
      );
      setLongitude(
        proposal.longitude !== undefined && proposal.longitude !== null
          ? String(proposal.longitude)
          : '',
      );
      setStartTime(proposal.startTime || '');
      setDurationMinutes(String(proposal.durationMinutes || 120));
      setNotes(proposal.notes || '');
      setEstimatedCost(
        proposal.estimatedCost !== undefined && proposal.estimatedCost !== null
          ? String(proposal.estimatedCost)
          : '',
      );
      setCurrency(proposal.currency || '');
      setSearchResults([]);
      setCoordError(null);
      setValidationError(null);
    }
  }, [proposal, itineraryDays]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !proposal) return null;

  const handleSearchCoordinates = async () => {
    const query = location.trim() || title.trim();
    if (!query) {
      setCoordError('Please enter a location or title to search.');
      return;
    }

    try {
      setIsSearchingCoords(true);
      setCoordError(null);
      const results = await searchCoordinates(query, destinationHint);
      if (results.length === 0) {
        setCoordError('No matching coordinates found. Coordinates remain unset.');
        setSearchResults([]);
      } else {
        setSearchResults(results);
      }
    } catch {
      setCoordError('Failed to search coordinates. Please try again.');
    } finally {
      setIsSearchingCoords(false);
    }
  };

  const handleSelectCoords = (res: GeocodeResult) => {
    setLatitude(String(res.latitude));
    setLongitude(String(res.longitude));
    if (!location.trim()) {
      setLocation(res.displayName.split(',')[0] || res.displayName);
    }
    setSearchResults([]);
    setCoordError(null);
  };

  const handleClearCoordinates = () => {
    setLatitude('');
    setLongitude('');
    setSearchResults([]);
    setCoordError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Activity title is required.');
      return;
    }

    const durationNum = parseInt(durationMinutes, 10);
    if (isNaN(durationNum) || durationNum < 1 || durationNum > 1440) {
      setValidationError('Duration must be between 1 and 1440 minutes.');
      return;
    }

    if (startTime.trim() && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime.trim())) {
      setValidationError('Start time must be in 24-hour HH:MM format (e.g. 09:30, 14:00).');
      return;
    }

    // Coordinates pair validation
    const hasLat = latitude.trim().length > 0;
    const hasLng = longitude.trim().length > 0;
    if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
      setValidationError('Latitude and longitude must both be provided or both left empty.');
      return;
    }

    let latNum: number | null = null;
    let lngNum: number | null = null;

    if (hasLat && hasLng) {
      latNum = parseFloat(latitude.trim());
      lngNum = parseFloat(longitude.trim());
      if (isNaN(latNum) || latNum < -90 || latNum > 90) {
        setValidationError('Latitude must be a valid number between -90 and 90.');
        return;
      }
      if (isNaN(lngNum) || lngNum < -180 || lngNum > 180) {
        setValidationError('Longitude must be a valid number between -180 and 180.');
        return;
      }
    }

    let costNum: number | null = null;
    if (estimatedCost.trim().length > 0) {
      costNum = parseFloat(estimatedCost.trim());
      if (isNaN(costNum) || costNum < 0) {
        setValidationError('Estimated cost must be a non-negative number.');
        return;
      }
    }

    // Find the matching itinerary day to derive dayNumber
    const targetDay = itineraryDays.find((d) => d.id === selectedDayId);
    const dayNumber = targetDay ? targetDay.dayNumber : proposal.dayNumber;

    const updatedProposal: AiActivityProposal = {
      ...proposal,
      title: trimmedTitle,
      itineraryDayId: selectedDayId,
      dayNumber,
      description: description.trim() || null,
      location: location.trim() || null,
      latitude: latNum !== null ? Number(latNum.toFixed(6)) : null,
      longitude: lngNum !== null ? Number(lngNum.toFixed(6)) : null,
      startTime: startTime.trim() || null,
      durationMinutes: durationNum,
      notes: notes.trim() || null,
      estimatedCost: costNum !== null ? Number(costNum.toFixed(2)) : null,
      currency: currency.trim() || null,
    };

    onSave(updatedProposal);
    onClose();
  };

  const hasValidCoords =
    latitude.trim().length > 0 &&
    longitude.trim().length > 0 &&
    !isNaN(parseFloat(latitude)) &&
    !isNaN(parseFloat(longitude));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-lifted p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in-50 zoom-in-95 text-sm">
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-accent-bg text-accent text-xs font-semibold mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Edit AI Proposal</span>
            </div>
            <h3 className="text-lg font-semibold text-primary-text tracking-tight">
              Edit Activity Details
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-secondary-text hover:text-primary-text rounded-md hover:bg-background transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {validationError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
              Activity Title <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Visit Senso-ji Temple"
              className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            />
          </div>

          {/* Itinerary Day Assignment */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
              Assigned Itinerary Day <span className="text-accent">*</span>
            </label>
            <select
              value={selectedDayId}
              onChange={(e) => setSelectedDayId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
            >
              {itineraryDays.map((day) => (
                <option key={day.id} value={day.id}>
                  Day {day.dayNumber}
                  {day.title ? ` — ${day.title}` : ''} ({day.date ? new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Time & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                Start Time
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="09:30"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                />
                <Clock className="w-3.5 h-3.5 text-secondary-text absolute left-2.5 top-2.5" />
              </div>
              <span className="text-[10px] text-secondary-text">24-hour format (HH:MM)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                Duration (mins) <span className="text-accent">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              />
              <span className="text-[10px] text-secondary-text">e.g. 60, 90, 120</span>
            </div>
          </div>

          {/* Location & Coordinates */}
          <div className="space-y-2 pt-1 border-t border-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                Location &amp; Coordinates
              </label>
              {hasValidCoords ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-accent bg-accent-bg px-2 py-0.5 rounded-md">
                  <MapPin className="w-3 h-3" />
                  <span>Map Pin Available</span>
                </span>
              ) : (
                <span className="text-[11px] text-secondary-text">
                  No map pin (unmapped)
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Senso-ji, Asakusa, Tokyo"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={handleSearchCoordinates}
                disabled={isSearchingCoords || (!location.trim() && !title.trim())}
                className="px-3 py-2 rounded-lg border border-border bg-surface text-secondary-text hover:text-primary-text hover:border-accent text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
                title="Lookup coordinates via OpenStreetMap"
              >
                {isSearchingCoords ? (
                  <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Lookup</span>
              </button>
            </div>

            {/* Geocode Search Results */}
            {searchResults.length > 0 && (
              <div className="p-2 rounded-lg border border-accent/40 bg-accent-bg/30 space-y-1.5 max-h-36 overflow-y-auto">
                <span className="text-[11px] font-semibold text-primary-text block">
                  Select Verified Coordinates:
                </span>
                {searchResults.map((res, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectCoords(res)}
                    className="w-full text-left p-1.5 rounded-md hover:bg-surface text-xs transition-colors flex items-start gap-1.5 text-primary-text"
                  >
                    <MapPin className="w-3 h-3 text-accent shrink-0 mt-0.5" />
                    <span className="line-clamp-1 flex-1 text-[11px]">
                      {res.displayName} ({res.latitude.toFixed(4)}, {res.longitude.toFixed(4)})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {coordError && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200">
                {coordError}
              </p>
            )}

            {/* Manual Lat/Lng Pair Inputs */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-secondary-text block mb-1">
                  Latitude (-90 to 90)
                </label>
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  placeholder="e.g. 35.7148"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-secondary-text block mb-1">
                  Longitude (-180 to 180)
                </label>
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  placeholder="e.g. 139.7967"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                />
              </div>
            </div>

            {hasValidCoords && (
              <button
                type="button"
                onClick={handleClearCoordinates}
                className="text-[11px] text-red-600 hover:underline pt-0.5"
              >
                Clear Coordinates (Remove Map Pin)
              </button>
            )}
          </div>

          {/* Estimated Cost & Currency */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                Estimated Cost
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="0.00"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
              />
              <span className="text-[10px] text-secondary-text">Per person (optional)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                Currency
              </label>
              <input
                type="text"
                maxLength={10}
                placeholder="e.g. USD, JPY"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors uppercase"
              />
              <span className="text-[10px] text-secondary-text">Currency code</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 pt-1 border-t border-border">
            <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
              Description
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief overview of the activity..."
              className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-primary-text">
              Travel Notes &amp; Tips
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Helpful reservation advice, opening hours, dress codes..."
              className="w-full px-3.5 py-2 rounded-lg border border-border bg-background text-primary-text text-xs focus:outline-hidden focus:ring-1 focus:ring-accent focus:border-accent transition-colors resize-none"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-xs font-semibold text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
