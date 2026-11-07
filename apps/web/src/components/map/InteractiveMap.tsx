'use client';

import React, { useEffect, useRef } from 'react';
import type * as LeafletType from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapMarkerItem {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string | null;
  badgeNumber?: number | string;
  badgeLabel?: string;
  isSelected?: boolean;
  color?: string;
  onClick?: () => void;
}

export interface InteractiveMapProps {
  center: [number, number];
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  markers?: MapMarkerItem[];
  className?: string;
  height?: string | number;
  scrollWheelZoom?: boolean;
  touchZoom?: boolean;
  dragging?: boolean;
  fitBoundsOnMarkers?: boolean;
  showAttribution?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
}

/**
 * Creates custom SVG/HTML markers using L.divIcon that match TripNext design system tokens:
 * - Accent: #66836B
 * - Primary text: #252A25
 * - Surface: #FFFFFF
 * - Shadow: shadow-lifted
 */
function createCustomMarkerIcon(L: typeof LeafletType, marker: MapMarkerItem): LeafletType.DivIcon {
  const isSelected = marker.isSelected;
  const badge = marker.badgeNumber !== undefined ? marker.badgeNumber : '';
  const bgColor = marker.color || '#66836B';

  const html = `
    <div class="relative group cursor-pointer -translate-x-1/2 -translate-y-full transition-transform duration-200 ${
      isSelected ? 'scale-115 z-50' : 'hover:scale-110 z-10'
    }">
      <div class="flex flex-col items-center">
        <!-- Marker Head -->
        <div style="background-color: ${bgColor};" class="w-8 h-8 rounded-full border-2 border-surface shadow-lifted flex items-center justify-center text-surface text-[11px] font-bold tracking-tight">
          ${badge ? `<span>${badge}</span>` : `
            <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          `}
        </div>
        <!-- Marker Point Tip -->
        <div style="border-top-color: ${bgColor};" class="w-0 h-0 border-x-4 border-x-transparent border-t-[6px] -mt-[1px]"></div>
        <!-- Subtle Drop Shadow -->
        <div class="w-3 h-1 bg-black/20 rounded-full blur-[1px] -mt-[2px]"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'tripnext-leaflet-div-icon',
    html,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

export function InteractiveMap({
  center,
  zoom = 13,
  minZoom = 3,
  maxZoom = 18,
  markers = [],
  className = '',
  height = '400px',
  scrollWheelZoom = false,
  touchZoom = true,
  dragging = true,
  fitBoundsOnMarkers = false,
  showAttribution = true,
  onMapClick,
}: InteractiveMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<LeafletType.Map | null>(null);
  const markersLayerRef = useRef<LeafletType.LayerGroup | null>(null);

  useEffect(() => {
    let isCancelled = false;

    // Dynamically import Leaflet only on the browser to avoid Next.js SSR window errors
    async function initMap() {
      if (!containerRef.current || mapInstanceRef.current) return;

      const L = (await import('leaflet')).default;
      if (isCancelled || !containerRef.current) return;

      // Ensure valid center coordinates
      const [lat, lng] = center;
      const validLat = typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90 ? lat : 0;
      const validLng = typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180 ? lng : 0;

      const map = L.map(containerRef.current, {
        center: [validLat, validLng],
        zoom,
        minZoom,
        maxZoom,
        scrollWheelZoom,
        touchZoom,
        dragging,
        zoomControl: false, // Custom placed zoom control below
        attributionControl: false,
      });

      // Add zoom control at bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Add attribution control at bottom-left or bottom-right
      if (showAttribution) {
        L.control
          .attribution({
            position: 'bottomleft',
            prefix: false,
          })
          .addAttribution(
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          )
          .addTo(map);
      }

      // Standard OpenStreetMap tile layer (clean, free, no API key watermark)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Layer group for marker management
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      mapInstanceRef.current = map;
      updateMarkers(L, map, markersLayer, markers, fitBoundsOnMarkers, [validLat, validLng]);
    }

    initMap();

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center & zoom dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const [lat, lng] = center;
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], zoom, { animate: true });
    }
  }, [center, zoom]);

  // Update markers on changes
  useEffect(() => {
    async function refreshMarkers() {
      const map = mapInstanceRef.current;
      const layer = markersLayerRef.current;
      if (!map || !layer) return;

      const L = (await import('leaflet')).default;
      updateMarkers(L, map, layer, markers, fitBoundsOnMarkers, center);
    }

    refreshMarkers();
  }, [markers, fitBoundsOnMarkers, center]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl bg-background border border-border shadow-subtle ${className}`}
      style={{ height }}
    >
      <div ref={containerRef} className="w-full h-full z-0" />
    </div>
  );
}

function updateMarkers(
  L: typeof LeafletType,
  map: LeafletType.Map,
  layer: LeafletType.LayerGroup,
  markers: MapMarkerItem[],
  fitBounds: boolean,
  fallbackCenter: [number, number],
) {
  layer.clearLayers();

  if (!markers || markers.length === 0) return;

  const validBounds: [number, number][] = [];

  for (const item of markers) {
    if (
      typeof item.latitude !== 'number' ||
      typeof item.longitude !== 'number' ||
      isNaN(item.latitude) ||
      isNaN(item.longitude)
    ) {
      continue;
    }

    const icon = createCustomMarkerIcon(L, item);
    const marker = L.marker([item.latitude, item.longitude], { icon });

    // Custom editorial popup styled with TripNext typography and tokens
    const popupContent = `
      <div class="p-1 min-w-[180px] max-w-[240px]">
        ${
          item.badgeLabel
            ? `<span class="inline-block px-2 py-0.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-accent bg-accent-bg rounded-full">${item.badgeLabel}</span>`
            : ''
        }
        <h4 class="font-semibold text-xs text-primary-text leading-snug">${item.title}</h4>
        ${
          item.description
            ? `<p class="text-[11px] text-secondary-text mt-1 line-clamp-2 leading-relaxed">${item.description}</p>`
            : ''
        }
      </div>
    `;

    marker.bindPopup(popupContent, {
      className: 'tripnext-leaflet-popup',
      closeButton: false,
      offset: [0, -38],
    });

    if (item.onClick) {
      marker.on('click', () => {
        item.onClick?.();
      });
    }

    layer.addLayer(marker);
    validBounds.push([item.latitude, item.longitude]);
  }

  if (fitBounds && validBounds.length > 1) {
    const bounds = L.latLngBounds(validBounds);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15, animate: true });
  } else if (validBounds.length === 1) {
    map.setView(validBounds[0], 13, { animate: true });
  } else if (fallbackCenter) {
    map.setView(fallbackCenter, 12, { animate: true });
  }
}
