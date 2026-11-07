'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Compass,
  MapPin,
  Sparkles,
  Users,
  X,
  ArrowRight,
  Info,
} from 'lucide-react';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTripModal({ isOpen, onClose }: CreateTripModalProps) {
  const [tripName, setTripName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-lifted p-6 sm:p-8 z-10 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-md text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-bg text-accent text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curate Journey</span>
          </div>
          <h2 className="font-semibold text-2xl sm:text-3xl text-primary-text tracking-tight">
            Start a New Journey
          </h2>
          <p className="text-xs sm:text-sm text-secondary-text mt-1 leading-relaxed">
            Outline your dream destinations, dates, and companion circle.
          </p>
        </div>

        {/* Form Preview Fields */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="trip-title"
              className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5"
            >
              Journey title
            </label>
            <div className="relative">
              <input
                id="trip-title"
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                placeholder="e.g. Autumn in Kyoto & Nara"
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="trip-dest"
              className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5"
            >
              Primary destination
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-secondary-text absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="trip-dest"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Kyoto, Japan"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="trip-start"
                className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5"
              >
                Departure
              </label>
              <input
                id="trip-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
            <div>
              <label
                htmlFor="trip-end"
                className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5"
              >
                Return
              </label>
              <input
                id="trip-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5] rounded-md transition-colors"
            >
              Cancel
            </button>
            <Link
              href="/trips/new"
              onClick={onClose}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-surface bg-accent hover:bg-accent-hover rounded-md transition-colors shadow-subtle"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Open Journey Atelier</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
