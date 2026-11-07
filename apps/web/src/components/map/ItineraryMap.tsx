'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type * as LeafletType from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Calendar,
  Compass,
  Layers,
  Lightbulb,
  MapPin,
  Maximize2,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { Activity, ActivitySuggestion, ItineraryDay } from '@tripnest/shared';
import { formatTime } from '../../lib/trip-utils';

// Harmonious palette of distinct colors for days, derived from TripNext nature-inspired tokens
export const DAY_COLORS = [
  '#66836B', // Day 1: Sage Green (Primary Accent)
  '#9E7B66', // Day 2: Warm Clay / Taupe
  '#4B6F8A', // Day 3: Slate Ocean Blue
  '#8B627D', // Day 4: Muted Heather / Plum
  '#B8863A', // Day 5: Warm Amber Bronze
  '#4E7A70', // Day 6: Pine Teal
  '#8C5A48', // Day 7: Earthy Terracotta
];

export function getDayColor(dayNumber: number): string {
  const index = Math.max(0, dayNumber - 1) % DAY_COLORS.length;
  return DAY_COLORS[index];
}

export interface ItineraryMapProps {
  days: ItineraryDay[];
  activeDayId?: string | null;
  onSelectDay?: (dayId: string) => void;
  selectedActivityId?: string | null;
  onSelectActivity?: (activityId: string) => void;
  hoveredActivityId?: string | null;
  onHoverActivity?: (activityId: string | null) => void;
  suggestions?: ActivitySuggestion[];
  selectedSuggestionId?: string | null;
  onSelectSuggestion?: (suggestionId: string) => void;
  tripDestinationCoords?: [number, number] | null;
  destinationName?: string;
  height?: string | number;
  className?: string;
  filterToActiveDay?: boolean;
}

/**
 * Custom SVG divIcon for confirmed itinerary stops.
 */
function createActivityMarkerIcon(
  L: typeof LeafletType,
  dayNumber: number,
  stopIndex: number,
  isSelected: boolean,
  isHovered: boolean,
): LeafletType.DivIcon {
  const color = getDayColor(dayNumber);
  const scaleClass = isSelected
    ? 'scale-125 z-50 ring-4 ring-white/90'
    : isHovered
      ? 'scale-115 z-40'
      : 'z-20 hover:scale-110';

  const html = `
    <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-full transition-all duration-200 ${scaleClass}">
      <div class="flex flex-col items-center">
        <!-- Main Marker Head -->
        <div style="background-color: ${color};" class="w-8 h-8 rounded-full border-2 border-white shadow-lifted flex items-center justify-center text-white text-xs font-bold tracking-tight">
          <span>${stopIndex}</span>
        </div>
        <!-- Point Tip -->
        <div style="border-top-color: ${color};" class="w-0 h-0 border-x-4 border-x-transparent border-t-[6px] -mt-[1px]"></div>
        <!-- Soft Drop Shadow -->
        <div class="w-3.5 h-1 bg-black/25 rounded-full blur-[1px] -mt-[2px]"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'tripnext-itinerary-activity-icon',
    html,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

/**
 * Custom SVG divIcon for companion activity suggestions (amber, dashed, with lightbulb).
 */
function createSuggestionMarkerIcon(
  L: typeof LeafletType,
  isSelected: boolean,
  isHovered: boolean,
): LeafletType.DivIcon {
  const scaleClass = isSelected
    ? 'scale-125 z-50 ring-4 ring-amber-300'
    : isHovered
      ? 'scale-115 z-40'
      : 'z-10 hover:scale-110';

  const html = `
    <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-full transition-all duration-200 ${scaleClass}">
      <div class="flex flex-col items-center">
        <!-- Suggestion Head with Dashed Gold Border -->
        <div class="w-8 h-8 rounded-full bg-amber-500 border-2 border-dashed border-white shadow-lifted flex items-center justify-center text-white text-xs font-bold">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
          </svg>
        </div>
        <!-- Point Tip -->
        <div class="w-0 h-0 border-x-4 border-x-transparent border-t-[6px] border-t-amber-500 -mt-[1px]"></div>
        <!-- Drop Shadow -->
        <div class="w-3.5 h-1 bg-black/25 rounded-full blur-[1px] -mt-[2px]"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'tripnext-itinerary-suggestion-icon',
    html,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

export function ItineraryMap({
  days = [],
  activeDayId,
  onSelectDay,
  selectedActivityId,
  onSelectActivity,
  hoveredActivityId,
  onHoverActivity,
  suggestions = [],
  selectedSuggestionId,
  onSelectSuggestion,
  tripDestinationCoords,
  destinationName = 'Destination Area',
  height = '500px',
  className = '',
  filterToActiveDay = false,
}: ItineraryMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);
  const routesLayerRef = useRef<LeafletType.LayerGroup | null>(null);

  // Map view filtering state: 'ALL' or specific day ID
  const [dayFilter, setDayFilter] = useState<string>('ALL');
  const [showSuggestionsOnMap, setShowSuggestionsOnMap] = useState<boolean>(true);

  // Synchronize day filter if prop says filterToActiveDay
  useEffect(() => {
    if (filterToActiveDay && activeDayId) {
      setDayFilter(activeDayId);
    }
  }, [filterToActiveDay, activeDayId]);

  // Determine activities with valid coordinates
  const mappedData = useMemo(() => {
    let totalActivities = 0;
    let activitiesWithCoords = 0;
    const daysWithMappedActivities: Array<{
      day: ItineraryDay;
      activities: Array<Activity & { stopIndex: number }>;
    }> = [];

    for (const day of days) {
      const acts = day.activities || [];
      totalActivities += acts.length;

      const validActs: Array<Activity & { stopIndex: number }> = [];
      acts.forEach((act, idx) => {
        const hasCoords =
          typeof act.latitude === 'number' &&
          typeof act.longitude === 'number' &&
          !isNaN(act.latitude) &&
          !isNaN(act.longitude) &&
          act.latitude >= -90 &&
          act.latitude <= 90 &&
          act.longitude >= -180 &&
          act.longitude <= 180;

        if (hasCoords) {
          activitiesWithCoords++;
          validActs.push({
            ...act,
            stopIndex: idx + 1,
          });
        }
      });

      daysWithMappedActivities.push({
        day,
        activities: validActs,
      });
    }

    // Filter pending suggestions with coordinates (excluding REJECTED)
    const validSuggestions = (suggestions || []).filter(
      (s) =>
        s.status === 'PENDING' &&
        typeof s.latitude === 'number' &&
        typeof s.longitude === 'number' &&
        !isNaN(s.latitude) &&
        !isNaN(s.longitude) &&
        s.latitude >= -90 &&
        s.latitude <= 90 &&
        s.longitude >= -180 &&
        s.longitude <= 180,
    );

    return {
      totalActivities,
      activitiesWithCoords,
      activitiesWithoutCoords: totalActivities - activitiesWithCoords,
      daysWithMappedActivities,
      validSuggestions,
    };
  }, [days, suggestions]);

  // Initialize Map
  useEffect(() => {
    let isCancelled = false;

    async function initMap() {
      if (!containerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;
      if (isCancelled || !containerRef.current) return;

      const defaultCenter: [number, number] = tripDestinationCoords || [35.0116, 135.7681];

      const map = L.map(containerRef.current, {
        center: defaultCenter,
        zoom: 12,
        minZoom: 2,
        maxZoom: 18,
        scrollWheelZoom: false, // Prevent accidental zooming during page scroll
        touchZoom: true,
        dragging: true,
        zoomControl: false,
        attributionControl: false,
      });

      // Add zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add OSM attribution at bottom-left
      L.control
        .attribution({ position: 'bottomleft', prefix: false })
        .addAttribution(
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        )
        .addTo(map);

      // Standard OpenStreetMap tile layer (clean, free, no API key watermark)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const routesLayer = L.layerGroup().addTo(map);
      const markersLayer = L.layerGroup().addTo(map);

      routesLayerRef.current = routesLayer;
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Initial render of markers and routes
      renderLayers(L, map, markersLayer, routesLayer);
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        routesLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers and daily polylines whenever data, selection, or filter changes
  useEffect(() => {
    async function updateLayers() {
      const map = mapInstanceRef.current;
      const markersLayer = markersLayerRef.current;
      const routesLayer = routesLayerRef.current;
      if (!map || !markersLayer || !routesLayer) return;

      const L = (await import('leaflet')).default;
      renderLayers(L, map, markersLayer, routesLayer);
    }

    updateLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mappedData,
    dayFilter,
    selectedActivityId,
    hoveredActivityId,
    selectedSuggestionId,
    showSuggestionsOnMap,
  ]);

  /**
   * Render all daily route polylines and numbered markers.
   */
  function renderLayers(
    L: typeof LeafletType,
    map: LeafletType.Map,
    markersLayer: LeafletType.LayerGroup,
    routesLayer: LeafletType.LayerGroup,
  ) {
    markersLayer.clearLayers();
    routesLayer.clearLayers();

    const allCoordsForBounds: [number, number][] = [];

    // 1. Render Confirmed Activities & Daily Route Polylines
    mappedData.daysWithMappedActivities.forEach(({ day, activities }) => {
      // Check day filter
      if (dayFilter !== 'ALL' && day.id !== dayFilter) {
        return;
      }

      const dayColor = getDayColor(day.dayNumber);
      const dayCoords: [number, number][] = [];

      activities.forEach((act) => {
        const lat = act.latitude!;
        const lng = act.longitude!;
        const coord: [number, number] = [lat, lng];
        dayCoords.push(coord);
        allCoordsForBounds.push(coord);

        const isSelected = act.id === selectedActivityId;
        const isHovered = act.id === hoveredActivityId;

        const icon = createActivityMarkerIcon(
          L,
          day.dayNumber,
          act.stopIndex,
          isSelected,
          isHovered,
        );

        const marker = L.marker(coord, { icon });

        // Styled popup with Geist typography
        const popupHtml = `
          <div class="p-1 min-w-[200px] max-w-[260px] text-left">
            <div class="flex items-center gap-1.5 pb-1 mb-1 border-b border-border/60">
              <span style="background-color: ${dayColor};" class="w-2.5 h-2.5 rounded-full inline-block"></span>
              <span class="text-[10px] font-bold uppercase tracking-wider text-secondary-text">
                Day ${day.dayNumber} • Stop ${act.stopIndex}
              </span>
            </div>
            <div class="font-bold text-xs text-primary-text leading-snug mt-1">
              ${act.title}
            </div>
            ${
              act.location
                ? `<div class="text-[11px] text-secondary-text flex items-center gap-1 mt-1">
                    <span>📍</span> <span class="truncate">${act.location}</span>
                   </div>`
                : ''
            }
            ${
              act.startTime
                ? `<div class="text-[11px] text-accent font-semibold flex items-center gap-1 mt-0.5">
                    <span>🕒</span> <span>${formatTime(act.startTime)}</span>
                   </div>`
                : ''
            }
            ${
              act.notes
                ? `<div class="text-[10px] text-secondary-text italic mt-1.5 pt-1 border-t border-border/40">
                    "${act.notes}"
                   </div>`
                : ''
            }
          </div>
        `;

        marker.bindPopup(popupHtml, {
          closeButton: false,
          offset: [0, -38],
          className: 'tripnext-leaflet-popup',
        });

        marker.on('click', () => {
          if (onSelectActivity) {
            onSelectActivity(act.id);
          }
          if (onSelectDay && day.id !== activeDayId) {
            onSelectDay(day.id);
          }
        });

        if (onHoverActivity) {
          marker.on('mouseover', () => onHoverActivity(act.id));
          marker.on('mouseout', () => onHoverActivity(null));
        }

        marker.addTo(markersLayer);

        // Open popup automatically if selected
        if (isSelected) {
          marker.openPopup();
        }
      });

      // Draw connecting polyline ONLY between stops on the SAME day
      // (Never connects across different days)
      if (dayCoords.length > 1) {
        L.polyline(dayCoords, {
          color: dayColor,
          weight: 3.5,
          opacity: 0.8,
          dashArray: '6, 8',
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(routesLayer);
      }
    });

    // 2. Render Companion Suggestions (Section 5)
    if (showSuggestionsOnMap && mappedData.validSuggestions.length > 0) {
      mappedData.validSuggestions.forEach((sug) => {
        // If filtering to a specific day, only show suggestions for that day
        if (dayFilter !== 'ALL' && sug.itineraryDayId !== dayFilter) {
          return;
        }

        const lat = sug.latitude!;
        const lng = sug.longitude!;
        const coord: [number, number] = [lat, lng];
        allCoordsForBounds.push(coord);

        const isSelected = sug.id === selectedSuggestionId;
        const icon = createSuggestionMarkerIcon(L, isSelected, false);
        const marker = L.marker(coord, { icon });

        const sugPopupHtml = `
          <div class="p-1 min-w-[210px] max-w-[270px] text-left">
            <div class="flex items-center gap-1.5 pb-1 mb-1 border-b border-border/60">
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                💡 Suggestion
              </span>
              <span class="text-[10px] text-secondary-text">
                ${sug.voteCount} ${sug.voteCount === 1 ? 'vote' : 'votes'}
              </span>
            </div>
            <div class="font-bold text-xs text-primary-text leading-snug mt-1">
              ${sug.title}
            </div>
            ${
              sug.location
                ? `<div class="text-[11px] text-secondary-text flex items-center gap-1 mt-1">
                    <span>📍</span> <span class="truncate">${sug.location}</span>
                   </div>`
                : ''
            }
            <div class="text-[10px] text-secondary-text mt-1.5">
              Suggested by <strong class="text-primary-text">${sug.suggestedBy?.name || 'Companion'}</strong>
            </div>
          </div>
        `;

        marker.bindPopup(sugPopupHtml, {
          closeButton: false,
          offset: [0, -38],
          className: 'tripnext-leaflet-popup',
        });

        marker.on('click', () => {
          if (onSelectSuggestion) {
            onSelectSuggestion(sug.id);
          }
        });

        marker.addTo(markersLayer);

        if (isSelected) {
          marker.openPopup();
        }
      });
    }

    // 3. Fit Bounds or Pan
    if (allCoordsForBounds.length > 1) {
      const bounds = L.latLngBounds(allCoordsForBounds);
      map.fitBounds(bounds, {
        padding: [45, 45],
        maxZoom: 15,
        animate: true,
      });
    } else if (allCoordsForBounds.length === 1) {
      map.setView(allCoordsForBounds[0], 14, { animate: true });
    } else if (tripDestinationCoords) {
      map.setView(tripDestinationCoords, 12, { animate: true });
    }
  }

  const handleResetBounds = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const allCoords: [number, number][] = [];
    mappedData.daysWithMappedActivities.forEach(({ day, activities }) => {
      if (dayFilter === 'ALL' || day.id === dayFilter) {
        activities.forEach((a) => allCoords.push([a.latitude!, a.longitude!]));
      }
    });

    if (showSuggestionsOnMap) {
      mappedData.validSuggestions.forEach((s) => {
        if (dayFilter === 'ALL' || s.itineraryDayId === dayFilter) {
          allCoords.push([s.latitude!, s.longitude!]);
        }
      });
    }

    if (allCoords.length > 1) {
      import('leaflet').then((mod) => {
        const L = mod.default;
        map.fitBounds(L.latLngBounds(allCoords), { padding: [45, 45], maxZoom: 15 });
      });
    } else if (allCoords.length === 1) {
      map.setView(allCoords[0], 14);
    } else if (tripDestinationCoords) {
      map.setView(tripDestinationCoords, 12);
    }
  };

  return (
    <div
      className={`relative w-full flex flex-col rounded-xl overflow-hidden bg-background border border-border shadow-subtle ${className}`}
      style={{ height }}
    >
      {/* Top Map Action Bar */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Day Filter Chips */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-surface/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-border shadow-subtle overflow-x-auto max-w-[calc(100%-60px)]">
          <button
            type="button"
            onClick={() => setDayFilter('ALL')}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors shrink-0 ${
              dayFilter === 'ALL'
                ? 'bg-accent text-surface shadow-xs'
                : 'text-secondary-text hover:text-primary-text'
            }`}
          >
            All Journey Days
          </button>

          {days.map((day) => {
            const isCurrent = dayFilter === day.id;
            const dayColor = getDayColor(day.dayNumber);

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setDayFilter(day.id)}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                  isCurrent
                    ? 'bg-surface text-primary-text border border-border shadow-xs'
                    : 'text-secondary-text hover:text-primary-text'
                }`}
              >
                <span
                  style={{ backgroundColor: dayColor }}
                  className="w-2 h-2 rounded-full shrink-0"
                />
                <span>Day {day.dayNumber}</span>
              </button>
            );
          })}
        </div>

        {/* Right Map Tools */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-surface/90 backdrop-blur-md p-1 rounded-lg border border-border shadow-subtle">
          {mappedData.validSuggestions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSuggestionsOnMap((prev) => !prev)}
              className={`p-1.5 rounded text-xs transition-colors ${
                showSuggestionsOnMap
                  ? 'bg-amber-100 text-amber-900 font-medium'
                  : 'text-secondary-text hover:text-primary-text'
              }`}
              title={showSuggestionsOnMap ? 'Hide Suggestions' : 'Show Suggestions'}
            >
              <Lightbulb className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleResetBounds}
            className="p-1.5 rounded text-xs text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
            title="Fit Map to Itinerary Bounds"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Leaflet Map View Container */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Empty State Banner (if no activities have coordinates) */}
      {mappedData.activitiesWithCoords === 0 && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center p-6 bg-surface/60 backdrop-blur-[2px]">
          <div className="pointer-events-auto bg-surface/95 border border-border rounded-xl p-6 shadow-lifted text-center max-w-sm space-y-3">
            <div className="w-10 h-10 rounded-full bg-accent-bg text-accent mx-auto flex items-center justify-center">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-sm text-primary-text">
                Itinerary Cartography Ready
              </h4>
              <p className="text-xs text-secondary-text leading-relaxed">
                Add geographic coordinates to your activities in the day planner to visualize daily route polylines and numbered stops in {destinationName}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Info Strip: Mapped stats and day color legend */}
      <div className="absolute bottom-3 right-3 z-30 pointer-events-none">
        <div className="pointer-events-auto bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border shadow-subtle text-[11px] text-secondary-text flex items-center gap-3">
          <span>
            <strong className="text-primary-text font-semibold">
              {mappedData.activitiesWithCoords}
            </strong>{' '}
            of {mappedData.totalActivities} stops mapped
          </span>

          {mappedData.activitiesWithoutCoords > 0 && (
            <span className="text-secondary-text/80 hidden sm:inline">
              ({mappedData.activitiesWithoutCoords} unmapped)
            </span>
          )}

          {mappedData.validSuggestions.length > 0 && showSuggestionsOnMap && (
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{mappedData.validSuggestions.length} suggested</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
