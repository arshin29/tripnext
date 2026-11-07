'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  LogOut,
  Mail,
  MapPin,
  Sparkles,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { InvitationDetails } from '@tripnest/shared';
import { useAuth } from '../../../context/AuthContext';
import { apiClient } from '../../../lib/api-client';
import { calculateDurationDays, formatDateRange } from '../../../lib/trip-utils';

export default function InviteAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, isAuthenticated, logout } = useAuth();

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchInvitation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient<InvitationDetails>(`/invitations/${token}`);
      if (res.data) {
        setInvitation(res.data);
      } else {
        setError('Invitation could not be loaded.');
      }
    } catch (err: any) {
      setError(err.message || 'Invitation not found or has expired.');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token, fetchInvitation]);

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      const res = await apiClient<{ tripId: string }>(`/invitations/${token}/accept`, {
        method: 'POST',
      });
      if (res.data?.tripId) {
        setActionSuccess('Welcome aboard! Redirecting to the shared journey...');
        setTimeout(() => {
          router.push(`/trips/${res.data!.tripId}`);
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      setActionLoading(true);
      await apiClient(`/invitations/${token}/decline`, {
        method: 'POST',
      });
      setInvitation((prev) => (prev ? { ...prev, status: 'DECLINED' } : null));
      setActionSuccess('Invitation declined.');
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-secondary-text mt-3">
          Verifying invitation details...
        </p>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border rounded-xl p-8 shadow-card text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="font-semibold text-2xl text-primary-text tracking-tight">
            Invalid or Expired Invitation
          </h2>
          <p className="text-xs text-secondary-text leading-relaxed">
            {error ||
              'This invitation link is not valid or has been revoked by the organizer.'}
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors"
            >
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isMatchingEmail =
    isAuthenticated && user?.email.toLowerCase() === invitation.email.toLowerCase();
  const duration = calculateDurationDays(invitation.startDate, invitation.endDate);

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent text-surface flex items-center justify-center">
            <Compass className="w-4 h-4" />
          </div>
          <span className="font-serif font-bold text-xl text-primary-text tracking-tight">
            TripNext
          </span>
        </Link>
      </div>

      <div className="max-w-xl mx-auto w-full bg-surface border border-border rounded-2xl shadow-card overflow-hidden">
        {/* Cover Header */}
        <div className="relative h-48 sm:h-56 w-full bg-accent-bg">
          {invitation.destinationCoverImage ? (
            <Image
              src={invitation.destinationCoverImage}
              alt={invitation.tripTitle}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-accent">
              <Compass className="w-12 h-12 opacity-40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary-text/80 via-primary-text/30 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4 text-surface">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent/90 text-surface text-[10px] font-semibold uppercase tracking-wider mb-1.5 backdrop-blur-sm">
              <Sparkles className="w-3 h-3" />
              <span>Co-traveler Invitation</span>
            </div>
            <h1 className="font-semibold text-2xl sm:text-3xl tracking-tight line-clamp-1">
              {invitation.tripTitle}
            </h1>
            <p className="text-xs text-surface/90 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <span>{invitation.destinationName}</span>
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Inviter Info Strip */}
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-background border border-border text-xs">
            <div className="w-9 h-9 rounded-full bg-accent-bg text-accent font-semibold flex items-center justify-center shrink-0">
              {invitation.inviterName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-primary-text truncate">
                {invitation.inviterName}
              </div>
              <div className="text-[11px] text-secondary-text truncate">
                {invitation.inviterEmail}
              </div>
            </div>
            <span className="text-[11px] text-accent font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent-bg">
              Organizer
            </span>
          </div>

          {/* Dates & Party Quick Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-secondary-text font-medium mb-1">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>Travel Dates</span>
              </div>
              <div className="font-semibold text-xs sm:text-sm text-primary-text">
                {formatDateRange(invitation.startDate, invitation.endDate)}
              </div>
              <div className="text-[11px] text-secondary-text">{duration} Days</div>
            </div>

            <div className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-secondary-text font-medium mb-1">
                <Mail className="w-3.5 h-3.5 text-accent" />
                <span>Invited Email</span>
              </div>
              <div className="font-semibold text-xs text-primary-text truncate">
                {invitation.email}
              </div>
              <div className="text-[11px] text-secondary-text">Exclusive invitation</div>
            </div>
          </div>

          {/* Action Success Toast */}
          {actionSuccess && (
            <div className="p-3 rounded-lg bg-accent-bg border border-accent/20 flex items-center gap-2 text-xs text-primary-text font-medium">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Status-specific Panels */}
          {invitation.status === 'ACCEPTED' && (
            <div className="p-4 rounded-xl bg-accent-bg border border-accent/20 text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 text-accent font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Invitation Already Accepted</span>
              </div>
              <p className="text-xs text-primary-text">
                You are a confirmed member of this journey.
              </p>
              <Link
                href={`/trips/${invitation.tripId}`}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle"
              >
                <span>Open Trip Itinerary</span>
              </Link>
            </div>
          )}

          {invitation.status === 'EXPIRED' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-amber-800 font-semibold text-sm">
                <Clock className="w-4 h-4" />
                <span>Invitation Expired</span>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                This invitation link has passed its expiration deadline. Please ask{' '}
                <span className="font-semibold">{invitation.inviterName}</span> to
                generate a new invitation link.
              </p>
            </div>
          )}

          {invitation.status === 'DECLINED' && (
            <div className="p-4 rounded-xl bg-background border border-border text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 text-secondary-text font-semibold text-sm">
                <XCircle className="w-4 h-4" />
                <span>Invitation Declined</span>
              </div>
              <p className="text-xs text-secondary-text">This invitation was declined.</p>
            </div>
          )}

          {invitation.status === 'PENDING' && (
            <>
              {!isAuthenticated ? (
                /* Unauthenticated State */
                <div className="space-y-4 pt-2">
                  <div className="p-3.5 rounded-lg bg-accent-bg border border-accent/20 text-xs text-primary-text leading-relaxed">
                    <span className="font-semibold text-accent">Sign in required:</span>{' '}
                    This invitation was sent to{' '}
                    <span className="font-semibold underline">{invitation.email}</span>.
                    Please sign in or create an account with this email address to accept.
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href={`/login?redirect=/invite/${token}`}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors text-center shadow-subtle"
                    >
                      <span>Sign In</span>
                    </Link>
                    <Link
                      href={`/register?redirect=/invite/${token}`}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-surface border border-border text-primary-text text-xs font-semibold hover:border-accent hover:text-accent transition-colors text-center shadow-subtle"
                    >
                      <span>Create Account</span>
                    </Link>
                  </div>
                </div>
              ) : isMatchingEmail ? (
                /* Authenticated & Email Matches */
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-secondary-text text-center">
                    You will be added as a co-traveler to curate activities, vote on
                    suggestions, and track shared expenses.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={handleAccept}
                      disabled={actionLoading}
                      className="w-full sm:flex-1 py-3 px-4 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>
                        {actionLoading
                          ? 'Joining Journey...'
                          : 'Accept Invitation & Join'}
                      </span>
                    </button>
                    <button
                      onClick={handleDecline}
                      disabled={actionLoading}
                      className="w-full sm:w-auto py-3 px-4 rounded-lg bg-background border border-border text-secondary-text text-xs font-medium hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Authenticated but Email Mismatched */
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-semibold text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Signed in as different account</span>
                  </div>
                  <p className="leading-relaxed">
                    You are signed in as{' '}
                    <span className="font-semibold">{user?.email}</span>. However, this
                    invitation was specifically addressed to{' '}
                    <span className="font-semibold">{invitation.email}</span>.
                  </p>
                  <button
                    onClick={() => logout()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-100 hover:bg-amber-200 text-amber-900 font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out & Switch Account</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-secondary-text mt-8">
        TripNext &copy; {new Date().getFullYear()} — Every journey, thoughtfully planned.
      </div>
    </div>
  );
}
