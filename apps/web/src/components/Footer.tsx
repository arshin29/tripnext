import Link from 'next/link';

export function Footer() {
  return (
    <footer className="w-full bg-surface border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <span className="font-semibold text-2xl text-primary-text block tracking-tight">
              TripNext
            </span>
            <p className="text-sm text-secondary-text max-w-sm leading-relaxed">
              A premium travel planning and collaboration platform designed for curating
              journeys, crafting harmonious day-by-day itineraries, and sharing the joy of
              exploration with companions.
            </p>
            <div className="pt-2 text-xs text-secondary-text">
              &copy; {new Date().getFullYear()} TripNext Inc. All rights reserved.
            </div>
          </div>

          {/* Column 1: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-primary-text tracking-wider uppercase">
              Product
            </h4>
            <ul className="space-y-2 text-sm text-secondary-text">
              <li>
                <Link
                  href="#planner"
                  className="hover:text-primary-text transition-colors"
                >
                  Itinerary Planner
                </Link>
              </li>
              <li>
                <Link
                  href="#expenses"
                  className="hover:text-primary-text transition-colors"
                >
                  Shared Expenses
                </Link>
              </li>
              <li>
                <Link
                  href="#collaborate"
                  className="hover:text-primary-text transition-colors"
                >
                  Companion Sync
                </Link>
              </li>
              <li>
                <Link
                  href="#destinations"
                  className="hover:text-primary-text transition-colors"
                >
                  Curated Guides
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Destinations */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-primary-text tracking-wider uppercase">
              Destinations
            </h4>
            <ul className="space-y-2 text-sm text-secondary-text">
              <li>
                <Link
                  href="#amalfi"
                  className="hover:text-primary-text transition-colors"
                >
                  Amalfi Coast
                </Link>
              </li>
              <li>
                <Link href="#kyoto" className="hover:text-primary-text transition-colors">
                  Kyoto &amp; Nara
                </Link>
              </li>
              <li>
                <Link
                  href="#swiss-alps"
                  className="hover:text-primary-text transition-colors"
                >
                  Swiss Oberland
                </Link>
              </li>
              <li>
                <Link
                  href="#provence"
                  className="hover:text-primary-text transition-colors"
                >
                  Provence &amp; Luberon
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal & Privacy */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-primary-text tracking-wider uppercase">
              Company
            </h4>
            <ul className="space-y-2 text-sm text-secondary-text">
              <li>
                <Link href="#about" className="hover:text-primary-text transition-colors">
                  Our Philosophy
                </Link>
              </li>
              <li>
                <Link
                  href="#privacy"
                  className="hover:text-primary-text transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#terms" className="hover:text-primary-text transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="#contact"
                  className="hover:text-primary-text transition-colors"
                >
                  Concierge Support
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
