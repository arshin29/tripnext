'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Globe,
  HelpCircle,
  LogOut,
  Map,
  Menu,
  Receipt,
  Search,
  Settings,
  Sparkles,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';

interface AppLayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
  pageSubtitle?: string;
  onOpenCreateTrip?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Overview', href: '/dashboard', icon: Compass },
  { name: 'Explore', href: '/explore', icon: Globe },
  { name: 'My Trips', href: '/trips', icon: Map },
  { name: 'Saved Places', href: '/saved', icon: Bookmark },
  { name: 'Shared with Me', href: '/shared', icon: Users },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function AppLayout({
  children,
  pageTitle,
  pageSubtitle,
  onOpenCreateTrip,
}: AppLayoutProps) {
  const { user, logout } = useAuth();
  const { savedCount } = useWishlist();
  const pathname = usePathname();
  const router = useRouter();

  // Responsive and interactive state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Unread notifications state
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: 'Welcome to TripNext',
      body: 'Your personal atelier for thoughtful travel planning is ready. Start by exploring curated guides or drafting a journey.',
      time: 'Just now',
      read: false,
    },
    {
      id: '2',
      title: 'Session security verified',
      body: 'Your account is authenticated with HTTP-only cookies and CSRF validation.',
      time: '1h ago',
      read: false,
    },
    {
      id: '3',
      title: 'Curated guide released',
      body: 'Amalfi Coast & Capri: 7-Day cliffside exploration guide has been added to Explore.',
      time: 'Yesterday',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut ⌘K / Ctrl+K for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setSearchModalOpen(false);
        setUserMenuOpen(false);
        setNotificationsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // User initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'TN';

  // Search filtered results
  const searchResults = searchQuery.trim()
    ? [
        {
          title: 'Kyoto Historic Temples & Zen Gardens',
          category: 'Curated Guide',
          href: '/explore',
        },
        {
          title: 'Amalfi Coast & Capri 7-Day Itinerary',
          category: 'Curated Guide',
          href: '/explore',
        },
        {
          title: 'Swiss Alps Glacier Express & Zermatt',
          category: 'Curated Guide',
          href: '/explore',
        },
        {
          title: 'Saved Places & Stays Wishlist',
          category: 'Bookmarks',
          href: '/saved',
        },
        {
          title: 'Travel Expenses & Shared Splits',
          category: 'Finance',
          href: '/expenses',
        },
        {
          title: 'Personal Profile & Password Settings',
          category: 'Account',
          href: '/settings',
        },
      ].filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : [];

  return (
    <div className="min-h-screen bg-background text-primary-text flex flex-col">
      <div className="flex flex-1">
        {/* =========================================================================
            DESKTOP SIDEBAR
            ========================================================================= */}
        <aside
          className={`hidden md:flex flex-col bg-surface border-r border-border transition-all duration-300 z-30 select-none ${
            sidebarCollapsed ? 'w-20' : 'w-64'
          }`}
          aria-label="Application sidebar"
        >
          {/* Brand & Collapse Header */}
          <div className="h-20 px-5 flex items-center justify-between border-b border-border">
            {!sidebarCollapsed ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-3 group overflow-hidden"
              >
                <div className="w-8 h-8 rounded-lg bg-accent text-surface flex items-center justify-center font-bold text-base shrink-0">
                  T
                </div>
                <span className="font-semibold text-xl tracking-tight text-primary-text group-hover:text-accent transition-colors leading-none">
                  TripNext
                </span>
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="w-10 h-10 rounded-lg bg-accent text-surface flex items-center justify-center font-bold text-lg mx-auto"
                title="TripNext"
              >
                T
              </Link>
            )}

            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-accent-bg text-accent font-semibold shadow-subtle'
                      : 'text-secondary-text hover:text-primary-text hover:bg-background'
                  } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform ${
                      isActive ? 'text-accent scale-105' : 'text-secondary-text'
                    }`}
                  />
                  {!sidebarCollapsed && (
                    <span className="truncate flex-1">{item.name}</span>
                  )}
                  {!sidebarCollapsed &&
                    (item.name === 'Saved Places' && savedCount > 0 ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-bg text-accent">
                        {savedCount}
                      </span>
                    ) : item.badge ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-accent-bg text-accent">
                        {item.badge}
                      </span>
                    ) : null)}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Card at bottom of Desktop Sidebar */}
          <div className="p-3 border-t border-border">
            {!sidebarCollapsed ? (
              <div className="p-2.5 rounded-lg bg-background border border-border flex items-center justify-between gap-3">
                <Link
                  href="/settings"
                  className="flex items-center gap-2.5 min-w-0 group flex-1"
                  title="View Profile Settings"
                >
                  <div className="w-9 h-9 rounded-full bg-accent text-surface text-xs font-semibold flex items-center justify-center shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-primary-text truncate group-hover:text-accent transition-colors">
                      {user?.name || 'Traveler'}
                    </p>
                    <p className="text-[11px] text-secondary-text truncate">
                      {user?.email}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-1.5 rounded-md text-secondary-text hover:text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-1">
                <Link
                  href="/settings"
                  className="w-9 h-9 rounded-full bg-accent text-surface text-xs font-semibold flex items-center justify-center"
                  title={`${user?.name} (${user?.email})`}
                >
                  {initials}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="p-1.5 rounded-md text-secondary-text hover:text-red-700 hover:bg-red-50 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* =========================================================================
            MOBILE DRAWER (SIDEBAR OVERLAY)
            ========================================================================= */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Drawer Pane */}
            <div className="relative w-72 max-w-[80vw] bg-surface h-full flex flex-col border-r border-border shadow-lifted z-10">
              <div className="h-16 px-6 flex items-center justify-between border-b border-border">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="w-7 h-7 rounded-md bg-accent text-surface flex items-center justify-center font-bold text-sm">
                    T
                  </div>
                  <span className="font-semibold text-xl tracking-tight text-primary-text">
                    TripNext
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-md text-secondary-text hover:text-primary-text"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Links */}
              <nav className="flex-1 py-4 px-4 space-y-1.5 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-accent-bg text-accent font-semibold'
                          : 'text-secondary-text hover:text-primary-text hover:bg-background'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 ${
                          isActive ? 'text-accent' : 'text-secondary-text'
                        }`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Drawer Profile & Logout */}
              <div className="p-4 border-t border-border bg-background/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-accent text-surface text-xs font-semibold flex items-center justify-center">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-primary-text truncate">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-secondary-text truncate">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            MAIN VIEW WRAPPER
            ========================================================================= */}
        <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
          {/* Main Top Header */}
          <header className="sticky top-0 z-20 h-20 bg-surface/95 border-b border-border px-4 sm:px-8 flex items-center justify-between gap-4">
            {/* Left: Mobile hamburger & breadcrumbs */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-md text-secondary-text hover:text-primary-text hover:bg-background"
                aria-label="Open sidebar menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-secondary-text">
                  <Link
                    href="/dashboard"
                    className="hover:text-primary-text transition-colors hidden sm:inline"
                  >
                    TripNext
                  </Link>
                  <span className="hidden sm:inline">/</span>
                  <span className="text-primary-text font-medium truncate">
                    {pageTitle || 'Overview'}
                  </span>
                </div>
                {pageSubtitle && (
                  <p className="text-[11px] text-secondary-text truncate hidden md:block">
                    {pageSubtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Center: Search Trigger Input */}
            <div className="flex-1 max-w-md mx-2 sm:mx-6 hidden sm:block">
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-secondary-text bg-background hover:bg-[#EFECE5] border border-border rounded-lg transition-colors group cursor-text"
                aria-label="Search destinations, trips, guides"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-secondary-text group-hover:text-primary-text" />
                  <span>Search destinations, trips, guides...</span>
                </div>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-secondary-text bg-surface border border-border rounded">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </button>
            </div>

            {/* Right: Actions, Notifications, User Menu */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile Search Icon */}
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="sm:hidden p-2 rounded-md text-secondary-text hover:text-primary-text hover:bg-background"
                aria-label="Open search dialog"
              >
                <Search className="w-4 h-4" />
              </button>

              {/* Plan Trip CTA button */}
              {onOpenCreateTrip && (
                <button
                  type="button"
                  onClick={onOpenCreateTrip}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-subtle"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Plan a Trip</span>
                </button>
              )}

              {/* Notifications Popover Trigger */}
              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-md text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
                  aria-label={`Notifications (${unreadCount} unread)`}
                  aria-expanded={notificationsOpen}
                >
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-surface" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-xl shadow-card py-2 z-50 animate-in fade-in-50 duration-150">
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary-text">
                          Notifications
                        </span>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-accent-bg text-accent">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={markAllNotificationsRead}
                          className="text-[11px] text-accent hover:underline font-medium"
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-border/60">
                      {notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3.5 transition-colors ${
                            item.read
                              ? 'bg-surface hover:bg-background/60'
                              : 'bg-accent-bg/30 hover:bg-accent-bg/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-semibold text-primary-text">
                              {item.title}
                            </h4>
                            <span className="text-[10px] text-secondary-text shrink-0">
                              {item.time}
                            </span>
                          </div>
                          <p className="text-xs text-secondary-text mt-1 leading-relaxed">
                            {item.body}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="px-4 py-2 border-t border-border bg-background/40 text-center">
                      <span className="text-[11px] text-secondary-text">
                        All trip alerts and companion syncs appear here
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* User Avatar & Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-accent/40 transition-all"
                  aria-label="User account menu"
                  aria-expanded={userMenuOpen}
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent text-surface text-xs font-semibold flex items-center justify-center">
                    {initials}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-surface border border-border rounded-xl shadow-card py-2 z-50 animate-in fade-in-50 duration-150">
                    <div className="px-4 py-2.5 border-b border-border">
                      <p className="text-xs font-semibold text-primary-text truncate">
                        {user?.name}
                      </p>
                      <p className="text-[11px] text-secondary-text truncate mt-0.5">
                        {user?.email}
                      </p>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5 text-accent" />
                        <span>Overview</span>
                      </Link>
                      <Link
                        href="/explore"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-accent" />
                        <span>Explore Destinations</span>
                      </Link>
                      <Link
                        href="/saved"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-accent" />
                        <span>Saved Places</span>
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-secondary-text hover:text-primary-text hover:bg-background transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-accent" />
                        <span>Account Settings</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-border">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{isLoggingOut ? 'Signing out...' : 'Sign out'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 w-full">{children}</main>
        </div>
      </div>

      {/* =========================================================================
          MOBILE BOTTOM NAVIGATION (Fixed at screen bottom on < md screens)
          ========================================================================= */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface/98 border-t border-border flex items-center justify-around h-16 px-2 shadow-card"
        aria-label="Mobile navigation bar"
      >
        {[
          { name: 'Overview', href: '/dashboard', icon: Compass },
          { name: 'Trips', href: '/trips', icon: Map },
          { name: 'Explore', href: '/explore', icon: Globe },
          { name: 'Saved', href: '/saved', icon: Bookmark },
          { name: 'Settings', href: '/settings', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-3 text-[11px] font-medium transition-colors ${
                isActive ? 'text-accent font-semibold' : 'text-secondary-text'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 ${
                  isActive ? 'text-accent scale-110' : 'text-secondary-text'
                } transition-transform`}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* =========================================================================
          SEARCH COMMAND MODAL DIALOG (⌘K)
          ========================================================================= */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div
            className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSearchModalOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-full max-w-xl bg-surface border border-border rounded-xl shadow-lifted overflow-hidden z-10 animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="p-3 border-b border-border flex items-center gap-3">
              <Search className="w-5 h-5 text-secondary-text ml-1" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search destinations, journeys, guides, or settings..."
                className="w-full bg-transparent text-sm text-primary-text placeholder:text-secondary-text focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-md text-secondary-text hover:text-primary-text"
                aria-label="Close search"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {searchQuery.trim() === '' ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-secondary-text">
                    Try searching for{' '}
                    <span className="font-semibold text-primary-text">
                      &ldquo;Kyoto&rdquo;
                    </span>
                    ,{' '}
                    <span className="font-semibold text-primary-text">
                      &ldquo;Amalfi&rdquo;
                    </span>
                    , or{' '}
                    <span className="font-semibold text-primary-text">
                      &ldquo;Settings&rdquo;
                    </span>
                  </p>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-1">
                  {searchResults.map((res, i) => (
                    <Link
                      key={i}
                      href={res.href}
                      onClick={() => setSearchModalOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-lg hover:bg-background transition-colors group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Compass className="w-4 h-4 text-accent" />
                        <span className="text-xs font-medium text-primary-text group-hover:text-accent">
                          {res.title}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-secondary-text bg-background group-hover:bg-surface px-2 py-0.5 rounded border border-border">
                        {res.category}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-xs text-secondary-text">
                    No results found for &ldquo;{searchQuery}&rdquo;.
                  </p>
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-border bg-background/50 flex items-center justify-between text-[11px] text-secondary-text">
              <span>Quick navigation</span>
              <span>Press ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
