'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Compass, ExternalLink, MapPin, Maximize2, Navigation, Sparkles } from 'lucide-react';
import { Destination } from '@tripnest/shared';
import type { MapMarkerItem } from './InteractiveMap';

// Dynamically import InteractiveMap with SSR disabled to prevent Leaflet window errors
const DynamicInteractiveMap = dynamic(
  () => import('./InteractiveMap').then((mod) => mod.InteractiveMap),
  {
    ssr: false,
    loading: () => <MapLoadingSkeleton />,
  },
);

export interface DestinationMapProps {
  destination: Destination;
  className?: string;
  height?: string;
}

function MapLoadingSkeleton() {
  return (
    <div className="w-full h-[360px] sm:h-[420px] rounded-xl bg-background border border-border animate-pulse flex flex-col items-center justify-center p-6 text-center space-y-3">
      <div className="w-10 h-10 rounded-full bg-accent-bg flex items-center justify-center text-accent">
        <Compass className="w-5 h-5 animate-spin" />
      </div>
      <p className="text-xs font-medium text-secondary-text tracking-wide">
        Loading geographic cartography...
      </p>
    </div>
  );
}

export function DestinationMap({
  destination,
  className = '',
  height = '420px',
}: DestinationMapProps) {
  const [zoomLevel, setZoomLevel] = useState(12);

  const hasCoords =
    typeof destination.latitude === 'number' &&
    typeof destination.longitude === 'number' &&
    !isNaN(destination.latitude) &&
    !isNaN(destination.longitude);

  const center: [number, number] = useMemo(() => {
    if (hasCoords) {
      return [destination.latitude!, destination.longitude!];
    }
    return [0, 0];
  }, [hasCoords, destination.latitude, destination.longitude]);

  const markers: MapMarkerItem[] = useMemo(() => {
    if (!hasCoords) return [];

    return [
      {
        id: `dest-${destination.id}`,
        latitude: destination.latitude!,
        longitude: destination.longitude!,
        title: destination.name,
        description: `${destination.city}, ${destination.country} • ${destination.category}`,
        badgeLabel: destination.category,
        color: '#66836B',
        isSelected: true,
      },
    ];
  }, [hasCoords, destination]);

  // Format latitude/longitude into editorial degree strings (e.g. "35.0116° N, 135.7681° E")
  const formattedCoords = useMemo(() => {
    if (!hasCoords) return null;
    const lat = destination.latitude!;
    const lng = destination.longitude!;
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
  }, [hasCoords, destination.latitude, destination.longitude]);

  // Fallback state if destination coordinates are not available
  if (!hasCoords) {
    return (
      <div className={`p-8 bg-surface border border-border rounded-xl text-center space-y-4 shadow-subtle ${className}`}>
        <div className="w-12 h-12 rounded-full bg-accent-bg text-accent flex items-center justify-center mx-auto">
          <MapPin className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-sm text-primary-text">
            Cartographic coordinates pending
          </h3>
          <p className="text-xs text-secondary-text max-w-sm mx-auto leading-relaxed">
            Detailed satellite mapping for {destination.city}, {destination.country} is being curated.
          </p>
        </div>
      </div>
    );
  }

  const openInOsm = () => {
    const url = `https://www.openstreetmap.org/?mlat=${destination.latitude}&mlon=${destination.longitude}#map=14/${destination.latitude}/${destination.longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`bg-surface border border-border rounded-xl overflow-hidden shadow-subtle flex flex-col ${className}`}>
      {/* Editorial Header */}
      <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent-bg text-accent flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-primary-text tracking-tight">
                Destination Cartography
              </h3>
              {destination.isFeatured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-surface text-[10px] font-medium">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Curated</span>
                </span>
              )}
            </div>
            <p className="text-xs text-secondary-text">
              {destination.city}, {destination.country}
            </p>
          </div>
        </div>

        {/* Coordinates Pill & OSM Action */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {formattedCoords && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border text-[11px] font-mono text-secondary-text">
              <Navigation className="w-3 h-3 text-accent" />
              <span>{formattedCoords}</span>
            </span>
          )}

          <button
            type="button"
            onClick={openInOsm}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface border border-border text-[11px] font-medium text-secondary-text hover:text-accent hover:border-accent transition-colors shadow-xs"
            title="Inspect on OpenStreetMap"
          >
            <span>OpenStreetMap</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full">
        <DynamicInteractiveMap
          center={center}
          zoom={zoomLevel}
          markers={markers}
          height={height}
          scrollWheelZoom={false}
          className="rounded-none border-0"
        />

        {/* Floating Quick Legend */}
        <div className="absolute top-3 left-3 z-[400] bg-surface/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border shadow-card pointer-events-none flex items-center gap-2 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-surface"></span>
          <span className="text-[11px] font-semibold text-primary-text">
            {destination.city} Regional Center
          </span>
        </div>
      </div>

      {/* Highlights Bar below Map */}
      {destination.attractions && destination.attractions.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-background/50 border-t border-border flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">
            Key Landmarks:
          </span>
          {destination.attractions.slice(0, 4).map((attraction, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface border border-border text-[11px] font-medium text-primary-text shadow-xs"
            >
              <MapPin className="w-3 h-3 text-accent" />
              <span>{attraction}</span>
            </span>
          ))}
          {destination.attractions.length > 4 && (
            <span className="text-[11px] text-secondary-text">
              +{destination.attractions.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
