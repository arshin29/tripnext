'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
      setMobileMenuOpen(false);
    }
  };

  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <header className="sticky top-0 z-40 w-full bg-surface/95 backdrop-blur-none border-b border-border">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-20 flex items-center justify-between">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2">
            <span className="font-semibold text-2xl sm:text-3xl tracking-tight text-primary-text group-hover:text-accent transition-colors">
              TripNext
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-secondary-text">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className={`hover:text-primary-text transition-colors ${
                    pathname === '/dashboard'
                      ? 'text-primary-text font-semibold border-b-2 border-accent pb-0.5'
                      : ''
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/settings"
                  className={`hover:text-primary-text transition-colors ${
                    pathname === '/settings'
                      ? 'text-primary-text font-semibold border-b-2 border-accent pb-0.5'
                      : ''
                  }`}
                >
                  Settings
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#destinations"
                  className="hover:text-primary-text transition-colors"
                >
                  Destinations
                </Link>
                <Link
                  href="/#planner"
                  className="hover:text-primary-text transition-colors"
                >
                  Itineraries
                </Link>
                <Link
                  href="/#journal"
                  className="hover:text-primary-text transition-colors"
                >
                  Journal
                </Link>
                <Link
                  href="/#about"
                  className="hover:text-primary-text transition-colors"
                >
                  About
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Action Buttons */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <Link
                href="/settings"
                className="flex items-center gap-2 text-sm text-primary-text hover:text-accent font-medium px-3 py-1.5 rounded-full bg-accent-bg transition-colors"
              >
                <User className="w-3.5 h-3.5 text-accent" />
                <span className="max-w-[140px] truncate">{user?.name}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-secondary-text hover:text-primary-text px-3 py-2 transition-colors disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
              </button>
            </div>
          ) : (
            <>
              {!isAuthPage && (
                <>
                  <Link
                    href="/login"
                    className="text-sm font-medium text-secondary-text hover:text-primary-text px-3 py-2 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-surface bg-accent hover:bg-accent-hover rounded-md transition-colors"
                  >
                    Get started
                  </Link>
                </>
              )}
              {pathname === '/login' && (
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-accent hover:underline"
                >
                  Need an account? Register
                </Link>
              )}
              {pathname === '/register' && (
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-accent hover:underline"
                >
                  Already registered? Log in
                </Link>
              )}
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-secondary-text hover:text-primary-text"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface px-6 py-4 space-y-3">
          {isAuthenticated ? (
            <>
              <div className="text-xs uppercase tracking-wider text-secondary-text pb-1">
                Signed in as{' '}
                <span className="font-semibold text-primary-text">{user?.name}</span>
              </div>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-primary-text"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-primary-text"
              >
                Settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left py-2 text-sm font-medium text-secondary-text hover:text-primary-text flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/#destinations"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-secondary-text"
              >
                Destinations
              </Link>
              <Link
                href="/#planner"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-secondary-text"
              >
                Itineraries
              </Link>
              <div className="pt-2 border-t border-border flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-primary-text border border-border rounded-md"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-surface bg-accent hover:bg-accent-hover rounded-md"
                >
                  Get started
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
