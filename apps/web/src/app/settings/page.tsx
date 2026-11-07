'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Shield,
  User,
} from 'lucide-react';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';

function SettingsContent() {
  const { user, updateProfile, logout } = useAuth();
  const router = useRouter();

  // Profile form state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Logout state
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Sync state if user changes
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setProfileError('Full name must be at least 2 characters long.');
      return;
    }

    if (!trimmedEmail) {
      setProfileError('Email address cannot be empty.');
      return;
    }

    if (trimmedName === user?.name && trimmedEmail === user?.email) {
      setProfileSuccess('No profile modifications were made.');
      return;
    }

    setProfileLoading(true);
    try {
      await updateProfile({
        name: trimmedName,
        email: trimmedEmail,
      });
      setProfileSuccess('Your profile details have been updated successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Unable to update profile. Please try again.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please provide your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    if (!hasUpper || !hasLower || !hasNumber) {
      setPasswordError(
        'New password must contain at least one uppercase letter, one lowercase letter, and one number.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match. Please re-type them.');
      return;
    }

    setPasswordLoading(true);
    try {
      await updateProfile({
        currentPassword,
        newPassword,
      });
      setPasswordSuccess('Your password has been changed securely.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(
        err.message ||
          'Unable to update password. Please check your current password and try again.',
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await logout();
      router.push('/login');
    } finally {
      setLogoutLoading(false);
    }
  };

  const formattedCreated = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 w-full space-y-8">
      {/* Header */}
      <div>
        <span className="text-[11px] uppercase tracking-widest text-accent font-semibold">
          Account &amp; Security
        </span>
        <h1 className="font-semibold text-3xl sm:text-4xl text-primary-text mt-1 tracking-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-secondary-text mt-1 leading-relaxed">
          Manage your personal identity, secure your credentials, and inspect your active
          session.
        </p>
      </div>

      <div className="space-y-8">
        {/* Section 1: Profile Information */}
        <section
          aria-labelledby="profile-heading"
          className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-card"
        >
          <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border">
            <div className="w-9 h-9 rounded-lg bg-accent-bg flex items-center justify-center text-accent">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="profile-heading"
                className="font-semibold text-xl text-primary-text tracking-tight"
              >
                Personal Profile
              </h2>
              <p className="text-xs text-secondary-text">
                Update how your name and contact email appear across your trips and
                collaborative spaces.
              </p>
            </div>
          </div>

          {profileSuccess && (
            <div
              role="status"
              className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-800"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{profileSuccess}</div>
            </div>
          )}

          {profileError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{profileError}</div>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="profile-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2"
                >
                  Full name
                </label>
                <input
                  id="profile-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={profileLoading}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="profile-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2"
                >
                  Email address
                </label>
                <input
                  id="profile-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={profileLoading}
                  className="w-full px-4 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-50"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium text-surface bg-accent hover:bg-accent-hover rounded-md transition-colors shadow-subtle disabled:opacity-60 cursor-pointer"
              >
                {profileLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving changes...</span>
                  </>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Section 2: Security & Password */}
        <section
          aria-labelledby="security-heading"
          className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-card"
        >
          <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-border">
            <div className="w-9 h-9 rounded-lg bg-accent-bg flex items-center justify-center text-accent">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="security-heading"
                className="font-semibold text-xl text-primary-text tracking-tight"
              >
                Password &amp; Security
              </h2>
              <p className="text-xs text-secondary-text">
                Keep your authentication credentials protected with a strong, distinct
                passphrase.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div
              role="status"
              className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-800"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{passwordSuccess}</div>
            </div>
          )}

          {passwordError && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-800"
            >
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{passwordError}</div>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="current-password"
                className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2"
              >
                Current password
              </label>
              <div className="relative max-w-md">
                <input
                  id="current-password"
                  type={showCurrent ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={passwordLoading}
                  className="w-full px-4 py-2.5 pr-11 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text"
                  aria-label={showCurrent ? 'Hide password' : 'Show password'}
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2"
                >
                  New password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 digit"
                    disabled={passwordLoading}
                    className="w-full px-4 py-2.5 pr-11 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text"
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-new-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2"
                >
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="confirm-new-password"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    disabled={passwordLoading}
                    className="w-full px-4 py-2.5 pr-11 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium text-surface bg-accent hover:bg-accent-hover rounded-md transition-colors shadow-subtle disabled:opacity-60 cursor-pointer"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Section 3: Session & Metadata */}
        <section
          aria-labelledby="session-heading"
          className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-6"
        >
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-accent-bg flex items-center justify-center text-accent shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="session-heading"
                className="font-semibold text-lg text-primary-text tracking-tight"
              >
                Active Session
              </h2>
              <p className="text-xs text-secondary-text mt-0.5">
                Protected with secure, HTTP-only cookie authentication and CSRF headers.
              </p>
              <div className="mt-2 text-xs text-secondary-text flex flex-wrap gap-4">
                <span>
                  Account ID:{' '}
                  <code className="bg-background px-1.5 py-0.5 rounded text-primary-text font-mono text-[11px]">
                    {user?.id}
                  </code>
                </span>
                <span>Member since: {formattedCreated}</span>
              </div>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors disabled:opacity-60 cursor-pointer"
            >
              {logoutLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Sign out of all devices</span>
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <AppLayout
        pageTitle="Settings"
        pageSubtitle="Manage your profile, security, and session"
      >
        <SettingsContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
