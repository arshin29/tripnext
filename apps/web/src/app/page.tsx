import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Compass, MapPin, Sparkles, Users, Wallet } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { TripPreview } from '@/components/TripPreview';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative px-6 sm:px-8 pt-12 pb-20 sm:pt-20 sm:pb-28 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-bg border border-border text-xs font-medium text-accent">
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                <span>The Art of Travel Planning</span>
              </div>

              <h1 className="font-bold text-4xl sm:text-6xl lg:text-6.5xl leading-[1.1] tracking-tight text-primary-text">
                Every journey, thoughtfully planned.
              </h1>

              <p className="text-lg sm:text-xl text-secondary-text leading-relaxed max-w-2xl font-light">
                TripNext transforms travel planning into a collaborative, stress-free art.
                Organize day-by-day itineraries, harmonize shared expenses, and explore
                destinations with the companions who matter most.
              </p>

              {/* Calls to Action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium text-surface bg-accent hover:bg-accent-hover rounded-md transition-colors shadow-subtle"
                >
                  Get started
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  href="/explore"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium text-primary-text bg-surface hover:bg-background border border-border rounded-md transition-colors"
                >
                  Explore destinations
                </Link>
              </div>

              {/* Editorial Quality Badges */}
              <div className="pt-6 border-t border-border grid grid-cols-3 gap-6 text-xs text-secondary-text">
                <div>
                  <div className="font-semibold text-lg text-primary-text mb-0.5 tracking-tight">
                    Zero Chaos
                  </div>
                  <span>Structured, calm itineraries</span>
                </div>
                <div>
                  <div className="font-semibold text-lg text-primary-text mb-0.5 tracking-tight">
                    Co-travelers
                  </div>
                  <span>Real-time companion sync</span>
                </div>
                <div>
                  <div className="font-semibold text-lg text-primary-text mb-0.5 tracking-tight">
                    Curated
                  </div>
                  <span>Handpicked local gems</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual — Strong Travel Photograph */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-lg overflow-hidden border border-border shadow-lifted aspect-[4/5] bg-surface">
                <Image
                  src="https://images.unsplash.com/photo-1499678329028-101435549a4e?auto=format&fit=crop&w=1200&q=80"
                  alt="Pastel cliffside villas of Positano on the Amalfi Coast"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-text/60 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-surface">
                  <span className="text-xs font-semibold tracking-wider uppercase text-accent-bg">
                    Featured Destination
                  </span>
                  <div className="font-semibold text-2xl mt-1 tracking-tight">
                    Positano, Amalfi Coast
                  </div>
                  <p className="text-xs text-surface/80 mt-1">
                    Cliffside pastel villas overlooking azure Tyrrhenian waters.
                  </p>
                </div>
              </div>

              {/* Decorative small card */}
              <div className="absolute -bottom-6 -left-6 bg-surface border border-border rounded-md p-4 shadow-card hidden sm:flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-accent-bg flex items-center justify-center text-accent">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-primary-text">
                    Curated Guide #12
                  </div>
                  <div className="text-xs text-secondary-text">
                    Amalfi 7-Day Editorial Itinerary
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Small preview of the trip-planning experience */}
        <section
          id="planner"
          className="px-6 sm:px-8 py-20 bg-surface border-y border-border"
        >
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
              <span className="text-xs font-semibold tracking-wider uppercase text-accent">
                The Experience
              </span>
              <h2 className="font-semibold text-3xl sm:text-4xl text-primary-text tracking-tight">
                Designed for clarity, built for togetherness.
              </h2>
              <p className="text-secondary-text text-base leading-relaxed">
                Take a look at how TripNext keeps all details, reservations, and group
                conversations in an elegant, unified space.
              </p>
            </div>

            <TripPreview />
          </div>
        </section>

        {/* 3 Pillars / Features */}
        <section id="features" className="px-6 sm:px-8 py-20 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-surface border border-border rounded-lg p-8 space-y-4">
              <div className="w-12 h-12 rounded-md bg-accent-bg flex items-center justify-center text-accent">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-2xl text-primary-text tracking-tight">
                Rhythmic Day Planning
              </h3>
              <p className="text-sm text-secondary-text leading-relaxed">
                Organize activities with sensible geographic clustering. Avoid burnout
                with balanced morning and evening itineraries crafted for leisure.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface border border-border rounded-lg p-8 space-y-4">
              <div className="w-12 h-12 rounded-md bg-accent-bg flex items-center justify-center text-accent">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-2xl text-primary-text tracking-tight">
                Companion Collaboration
              </h3>
              <p className="text-sm text-secondary-text leading-relaxed">
                Invite friends and family to suggest places, vote on activities, and keep
                flight or hotel confirmations neatly centralized.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface border border-border rounded-lg p-8 space-y-4">
              <div className="w-12 h-12 rounded-md bg-accent-bg flex items-center justify-center text-accent">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-2xl text-primary-text tracking-tight">
                Transparent Expenses
              </h3>
              <p className="text-sm text-secondary-text leading-relaxed">
                Record shared villa rentals, ferry tickets, and group dinners. Settle up
                with fair split calculations across any global currency.
              </p>
            </div>
          </div>
        </section>

        {/* Editorial Destination Showcase preview */}
        <section
          id="destinations"
          className="px-6 sm:px-8 py-20 bg-surface border-t border-border"
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-xs font-semibold tracking-wider uppercase text-accent">
                  Curated Escapes
                </span>
                <h2 className="font-semibold text-3xl sm:text-4xl text-primary-text mt-1 tracking-tight">
                  Inspiration for your next chapter.
                </h2>
              </div>
              <Link
                href="/explore"
                className="text-sm font-medium text-accent hover:text-accent-hover inline-flex items-center gap-1.5"
              >
                Browse all guides <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="group border border-border rounded-lg overflow-hidden bg-background">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80"
                    alt="Yosemite National Park"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6 space-y-2">
                  <div className="flex items-center justify-between text-xs text-secondary-text">
                    <span>Nature &amp; Wilderness</span>
                    <span>5 Days</span>
                  </div>
                  <h4 className="font-semibold text-xl text-primary-text tracking-tight">
                    High Sierra &amp; Yosemite
                  </h4>
                  <p className="text-xs text-secondary-text line-clamp-2">
                    Alpine granite domes, sequoia groves, and starry valley nights.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="group border border-border rounded-lg overflow-hidden bg-background">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80"
                    alt="Kyoto Japan"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6 space-y-2">
                  <div className="flex items-center justify-between text-xs text-secondary-text">
                    <span>Culture &amp; Heritage</span>
                    <span>8 Days</span>
                  </div>
                  <h4 className="font-semibold text-xl text-primary-text tracking-tight">
                    Kyoto&apos;s Historic Temples
                  </h4>
                  <p className="text-xs text-secondary-text line-clamp-2">
                    Bamboo paths, quiet Zen rock gardens, and traditional tea ceremonies.
                  </p>
                </div>
              </div>

              {/* Card 3 */}
              <div className="group border border-border rounded-lg overflow-hidden bg-background">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <Image
                    src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80"
                    alt="Scenic open road"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-6 space-y-2">
                  <div className="flex items-center justify-between text-xs text-secondary-text">
                    <span>Road Expedition</span>
                    <span>10 Days</span>
                  </div>
                  <h4 className="font-semibold text-xl text-primary-text tracking-tight">
                    South Island Discovery
                  </h4>
                  <p className="text-xs text-secondary-text line-clamp-2">
                    Glacial fiords, winding mountain passes, and tranquil lake towns.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to action section */}
        <section id="get-started" className="px-6 sm:px-8 py-20 max-w-7xl mx-auto">
          <div className="bg-surface border border-border rounded-lg p-10 sm:p-16 text-center max-w-3xl mx-auto space-y-6">
            <h2 className="font-semibold text-3xl sm:text-4xl text-primary-text tracking-tight">
              Begin planning your next journey.
            </h2>
            <p className="text-secondary-text text-base leading-relaxed max-w-xl mx-auto">
              Join thousands of travelers who craft memorable itineraries with TripNext.
              Start for free today.
            </p>
            <div className="pt-2">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-medium text-surface bg-accent hover:bg-accent-hover rounded-md transition-colors shadow-subtle"
              >
                Create your first trip
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
