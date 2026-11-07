import {
  Calendar,
  Clock,
  Compass,
  MapPin,
  Users,
  Wallet,
  CheckCircle2,
} from 'lucide-react';

export function TripPreview() {
  return (
    <div className="bg-surface border border-border rounded-lg shadow-card p-6 sm:p-8 max-w-4xl mx-auto">
      {/* Header bar of preview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-accent-bg text-accent">
              Upcoming Journey
            </span>
            <span className="text-xs text-secondary-text">Draft #04</span>
          </div>
          <h3 className="font-semibold text-2xl sm:text-3xl text-primary-text tracking-tight">
            Amalfi Coast &amp; Capri
          </h3>
          <p className="text-sm text-secondary-text flex items-center gap-4 mt-1">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              Sept 14 – Sept 21
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-accent" />4 Companions
            </span>
          </p>
        </div>

        {/* Companion Avatars */}
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-accent text-surface text-xs font-medium flex items-center justify-center border-2 border-surface">
              EK
            </div>
            <div className="w-8 h-8 rounded-full bg-[#8E7D6B] text-surface text-xs font-medium flex items-center justify-center border-2 border-surface">
              TL
            </div>
            <div className="w-8 h-8 rounded-full bg-[#5E738A] text-surface text-xs font-medium flex items-center justify-center border-2 border-surface">
              MR
            </div>
            <div className="w-8 h-8 rounded-full bg-[#A8987E] text-surface text-xs font-medium flex items-center justify-center border-2 border-surface">
              +1
            </div>
          </div>
          <span className="text-xs font-medium text-secondary-text hidden sm:inline">
            All synced
          </span>
        </div>
      </div>

      {/* Days Navigation Pill */}
      <div className="py-4 flex items-center gap-2 border-b border-border overflow-x-auto text-xs font-medium">
        <button className="px-3.5 py-1.5 rounded-md bg-primary-text text-surface">
          Day 1 · Arrival
        </button>
        <button className="px-3.5 py-1.5 rounded-md text-secondary-text hover:text-primary-text hover:bg-background transition-colors">
          Day 2 · Ravello
        </button>
        <button className="px-3.5 py-1.5 rounded-md text-secondary-text hover:text-primary-text hover:bg-background transition-colors">
          Day 3 · Capri Sail
        </button>
        <button className="px-3.5 py-1.5 rounded-md text-secondary-text hover:text-primary-text hover:bg-background transition-colors">
          Day 4 · Positano
        </button>
      </div>

      {/* Timeline items */}
      <div className="py-6 space-y-4">
        {/* Item 1 */}
        <div className="flex items-start gap-4 p-3.5 rounded-md bg-background/60 border border-border">
          <div className="w-8 h-8 rounded-md bg-surface flex items-center justify-center border border-border text-accent shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                10:00 AM
              </span>
              <span className="text-xs text-secondary-text flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Villa Cimbrone
              </span>
            </div>
            <h4 className="text-sm font-semibold text-primary-text mt-0.5">
              Infinity Terrace &amp; Cliffside Gardens
            </h4>
            <p className="text-xs text-secondary-text mt-0.5">
              Private morning walk before peak crowds arrive. Pre-booked garden passes.
            </p>
          </div>
          <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-1" />
        </div>

        {/* Item 2 */}
        <div className="flex items-start gap-4 p-3.5 rounded-md bg-surface border border-border">
          <div className="w-8 h-8 rounded-md bg-accent-bg flex items-center justify-center border border-border text-accent shrink-0 mt-0.5">
            <Compass className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                01:30 PM
              </span>
              <span className="text-xs text-secondary-text flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Trattoria da Cumpa&apos; Cosimo
              </span>
            </div>
            <h4 className="text-sm font-semibold text-primary-text mt-0.5">
              Handmade Pasta &amp; Local Amalfi Wines
            </h4>
            <p className="text-xs text-secondary-text mt-0.5">
              Table reserved under Elena. Family-style tasting menu requested.
            </p>
          </div>
          <div className="w-4 h-4 rounded-full border border-border shrink-0 mt-1" />
        </div>

        {/* Item 3 */}
        <div className="flex items-start gap-4 p-3.5 rounded-md bg-surface border border-border">
          <div className="w-8 h-8 rounded-md bg-accent-bg flex items-center justify-center border border-border text-accent shrink-0 mt-0.5">
            <Wallet className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                05:30 PM
              </span>
              <span className="text-xs text-secondary-text flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Amalfi Marina
              </span>
            </div>
            <h4 className="text-sm font-semibold text-primary-text mt-0.5">
              Wooden Gozzo Sunset Sail
            </h4>
            <p className="text-xs text-secondary-text mt-0.5">
              €320 shared expense • Split evenly among 4 travelers (€80 / person)
            </p>
          </div>
          <div className="w-4 h-4 rounded-full border border-border shrink-0 mt-1" />
        </div>
      </div>

      {/* Footer of preview */}
      <div className="pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between text-xs text-secondary-text gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-accent inline-block"></span>
          <span>Shared itinerary updated 12 minutes ago by Thomas</span>
        </div>
        <div className="font-medium text-primary-text">
          Budget allocated: €1,850 of €2,400
        </div>
      </div>
    </div>
  );
}
