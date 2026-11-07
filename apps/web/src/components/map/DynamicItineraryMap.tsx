'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Compass } from 'lucide-react';
import type { ItineraryMapProps } from './ItineraryMap';

function ItineraryMapLoadingSkeleton({ height = '500px' }: { height?: string | number }) {
  return (
    <div
      style={{ height }}
      className="w-full rounded-xl bg-background border border-border animate-pulse flex flex-col items-center justify-center p-6 text-center space-y-3"
    >
      <div className="w-10 h-10 rounded-full bg-accent-bg flex items-center justify-center text-accent">
        <Compass className="w-5 h-5 animate-spin" />
      </div>
      <p className="text-xs font-medium text-secondary-text tracking-wide">
        Loading journey cartography &amp; daily routes...
      </p>
    </div>
  );
}

const DynamicComponent = dynamic(
  () => import('./ItineraryMap').then((mod) => mod.ItineraryMap),
  {
    ssr: false,
    loading: () => <ItineraryMapLoadingSkeleton />,
  },
);

export function DynamicItineraryMap(props: ItineraryMapProps) {
  return <DynamicComponent {...props} />;
}
