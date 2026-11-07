'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Compass,
  Copy,
  Edit2,
  Globe,
  Info,
  Mail,
  Map,
  MapPin,
  Plus,
  Share2,
  Sparkles,
  Trash2,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Currency,
  CURRENCY_SYMBOLS,
  SUPPORTED_CURRENCIES,
  Trip,
  TripInvitation,
  TripMember,
  UpdateTripInput,
} from '@tripnest/shared';
import { ProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { AppLayout } from '../../../components/layout/AppLayout';
import { useAuth } from '../../../context/AuthContext';
import { apiClient } from '../../../lib/api-client';
import {
  calculateDurationDays,
  formatCurrency,
  formatDateRange,
  formatTime,
  getStatusBadge,
} from '../../../lib/trip-utils';

export default function TripOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;
  const { user } = useAuth();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TripInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editTravelers, setEditTravelers] = useState(1);
  const [editBudget, setEditBudget] = useState('');
  const [editCurrency, setEditCurrency] = useState<Currency>('INR');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Remove member state
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  // Feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isOwner = trip
    ? trip.isOwner !== false &&
      (trip.userId === user?.id || trip.currentUserRole === 'OWNER')
    : false;

  const fetchTripData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient<Trip>(`/trips/${tripId}`);
      if (res.data) {
        setTrip(res.data);
        setEditTitle(res.data.title);
        setEditDescription(res.data.description || '');
        setEditStartDate(res.data.startDate.split('T')[0]);
        setEditEndDate(res.data.endDate.split('T')[0]);
        setEditTravelers(res.data.travelerCount);
        setEditBudget(res.data.budgetAmount ? String(res.data.budgetAmount) : '');
        setEditCurrency((res.data.currency as Currency) || 'INR');
        setEditCoverImage(res.data.coverImage || '');

        // Populate members directly from trip response without extra roundtrip
        if (res.data.members) {
          setMembers(res.data.members);
        }

        // Fetch pending invitations concurrently if owner
        const canManage =
          res.data.isOwner !== false &&
          (res.data.userId === user?.id || res.data.currentUserRole === 'OWNER');
        if (canManage) {
          apiClient<TripInvitation[]>(`/trips/${tripId}/invitations`)
            .then((invRes) => {
              if (invRes.data) {
                setPendingInvitations(invRes.data);
              }
            })
            .catch(() => {
              // Member might not have permission
            });
        }
      } else {
        setError('Trip details could not be loaded.');
      }
    } catch (err: any) {
      console.error('Failed to load trip:', err);
      setError(err.message || 'Failed to load trip information.');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, user?.id]);

  useEffect(() => {
    if (tripId) {
      fetchTripData();
    }
  }, [tripId, fetchTripData]);

  // Update Trip handler
  const handleUpdateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    try {
      setIsUpdating(true);
      const payload: UpdateTripInput = {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        startDate: editStartDate,
        endDate: editEndDate,
        travelerCount: editTravelers,
        budgetAmount: editBudget ? parseFloat(editBudget) : undefined,
        currency: editCurrency,
        coverImage: editCoverImage.trim() || undefined,
      };

      const res = await apiClient<Trip>(`/trips/${trip.id}`, {
        method: 'PATCH',
        body: payload,
      });

      if (res.data) {
        setTrip(res.data);
        setIsEditModalOpen(false);
        showToast('Trip details updated successfully.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update trip.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Trip handler
  const handleDeleteTrip = async () => {
    if (!trip) return;
    try {
      setIsDeleting(true);
      await apiClient(`/trips/${trip.id}`, {
        method: 'DELETE',
      });
      router.push('/trips');
    } catch (err: any) {
      alert(err.message || 'Failed to delete trip.');
      setIsDeleting(false);
    }
  };

  // Generate Invitation Link
  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setGeneratedInviteUrl(null);

    if (!inviteEmail.trim()) {
      setInviteError('Please enter an email address.');
      return;
    }

    try {
      setIsInviting(true);
      const res = await apiClient<TripInvitation>(`/trips/${tripId}/invitations`, {
        method: 'POST',
        body: { email: inviteEmail.trim() },
      });

      if (res.data?.invitationUrl) {
        const fullUrl = `${window.location.origin}${res.data.invitationUrl}`;
        setGeneratedInviteUrl(fullUrl);
        showToast('Invitation link generated!');
        setInviteEmail('');

        // Refresh invitations list
        const invRes = await apiClient<TripInvitation[]>(`/trips/${tripId}/invitations`);
        if (invRes.data) setPendingInvitations(invRes.data);
      }
    } catch (err: any) {
      setInviteError(err.message || 'Failed to create invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  // Copy invitation link to clipboard
  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      showToast('Invitation link copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      showToast('Could not copy automatically. Please copy the link manually.');
    }
  };

  // Revoke Invitation
  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await apiClient(`/trips/${tripId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      showToast('Invitation revoked.');
    } catch (err: any) {
      showToast(err.message || 'Failed to revoke invitation.');
    }
  };

  // Remove Member
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this companion from the journey?')) {
      return;
    }
    try {
      setRemovingMemberId(memberId);
      await apiClient(`/trips/${tripId}/members/${memberId}`, {
        method: 'DELETE',
      });
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      showToast('Companion removed from trip.');
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppLayout pageTitle="Loading Trip...">
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-secondary-text">Loading journey canvas...</p>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  if (error || !trip) {
    return (
      <ProtectedRoute>
        <AppLayout pageTitle="Trip Not Found">
          <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center text-accent mx-auto">
              <Compass className="w-6 h-6" />
            </div>
            <h2 className="font-semibold text-2xl text-primary-text tracking-tight">
              Journey Unavailable
            </h2>
            <p className="text-xs text-secondary-text max-w-md mx-auto">
              {error ||
                'The requested trip could not be found or you do not have permission to view it.'}
            </p>
            <div className="pt-2">
              <Link
                href="/trips"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to My Trips</span>
              </Link>
            </div>
          </div>
        </AppLayout>
      </ProtectedRoute>
    );
  }

  const statusBadge = getStatusBadge(trip.status);
  const duration = calculateDurationDays(trip.startDate, trip.endDate);
  const totalActivities = trip.activitiesCount || 0;
  const completedActivities = trip.completedActivitiesCount || 0;
  const progressPct =
    totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

  const coverPhoto =
    trip.coverImage ||
    trip.destination?.coverImage ||
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

  const budgetPerPerson =
    trip.budgetAmount && trip.travelerCount > 0
      ? Math.round(trip.budgetAmount / trip.travelerCount)
      : null;

  return (
    <ProtectedRoute>
      <AppLayout
        pageTitle={trip.title}
        pageSubtitle={`${trip.destination?.city || 'Curated'} Itinerary`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
          {/* Toast Notification */}
          {toastMessage && (
            <div
              role="status"
              className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-50 bg-primary-text text-surface text-xs font-medium px-4 py-3 rounded-lg shadow-lifted border border-border animate-in fade-in-50 duration-150 flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Breadcrumb & Ownership Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Link
              href="/trips"
              className="inline-flex items-center gap-2 text-xs font-medium text-secondary-text hover:text-primary-text transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to My Trips</span>
            </Link>

            <div className="flex items-center gap-2 flex-wrap">
              {!isOwner && (
                <div className="px-3 py-1 rounded-full bg-accent-bg text-accent text-xs font-medium flex items-center gap-1.5 border border-accent/20">
                  <Users className="w-3.5 h-3.5" />
                  <span>Shared with you as Co-traveler</span>
                </div>
              )}

              {/* Owner actions */}
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setGeneratedInviteUrl(null);
                      setInviteError(null);
                      setIsInviteModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-surface text-xs font-medium hover:bg-accent-hover transition-colors shadow-xs"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Invite People</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Trip</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-1.5 rounded-md bg-surface border border-border text-secondary-text hover:text-rose-600 hover:border-rose-200 transition-colors shadow-xs"
                    aria-label="Delete journey"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Hero Banner Section */}
          <div className="relative rounded-2xl overflow-hidden border border-border shadow-card bg-surface">
            {/* Background Cover Photo */}
            <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full min-h-[260px] bg-background">
              <Image
                src={coverPhoto}
                alt={trip.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-text/90 via-primary-text/40 to-transparent" />

              {/* Status and Category Badges */}
              <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-xs ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`} />
                  <span>{statusBadge.label}</span>
                </div>

                {trip.destination?.category && (
                  <span className="px-2.5 py-1 rounded-full bg-surface/90 backdrop-blur-xs text-xs font-medium text-primary-text border border-border/40">
                    {trip.destination.category}
                  </span>
                )}
              </div>

              {/* Title & Overlay Content */}
              <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-surface">
                <div className="text-xs sm:text-sm text-surface/90 flex items-center gap-1.5 mb-1">
                  <MapPin className="w-4 h-4 text-accent" />
                  <span className="font-medium">
                    {trip.destination
                      ? `${trip.destination.city}, ${trip.destination.country}`
                      : 'Curated Voyage'}
                  </span>
                </div>
                <h1 className="font-semibold text-2xl sm:text-4xl lg:text-4.5xl text-surface tracking-tight drop-shadow-xs">
                  {trip.title}
                </h1>
                {trip.description && (
                  <p className="text-xs sm:text-sm text-surface/80 mt-1 max-w-2xl line-clamp-2 leading-relaxed">
                    {trip.description}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Action Bar under Hero */}
            <div className="p-4 sm:p-6 bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border">
              {/* Progress Summary */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-accent-bg flex items-center justify-center text-accent shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-primary-text">
                    {completedActivities} of {totalActivities} Activities Completed (
                    {progressPct}%)
                  </div>
                  <div className="w-44 h-1.5 bg-background rounded-full overflow-hidden border border-border/60 mt-1.5">
                    <div
                      className="h-full bg-accent transition-all duration-300 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Itinerary & Expenses */}
              <div className="flex items-center gap-3">
                <Link
                  href="/expenses"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-background border border-border text-primary-text text-xs sm:text-sm font-semibold hover:border-accent hover:text-accent transition-colors shadow-subtle"
                >
                  <Wallet className="w-4 h-4 text-accent" />
                  <span>Group Expenses</span>
                </Link>

                <Link
                  href={`/trips/${trip.id}/itinerary`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-surface text-xs sm:text-sm font-semibold hover:bg-accent-hover transition-colors shadow-subtle text-center"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Day-by-Day Planner</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Key Facts Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-accent" />
                <span>Schedule</span>
              </span>
              <div className="font-semibold text-sm sm:text-base text-primary-text">
                {formatDateRange(trip.startDate, trip.endDate)}
              </div>
              <div className="text-[11px] text-secondary-text">
                {duration} {duration === 1 ? 'Day' : 'Days'} total
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-accent" />
                <span>Party Size</span>
              </span>
              <div className="font-semibold text-sm sm:text-base text-primary-text">
                {members.length > 0 ? members.length : trip.travelerCount}{' '}
                {members.length === 1 ? 'Traveler' : 'Travelers'}
              </div>
              <div className="text-[11px] text-secondary-text">
                {members.length > 1 ? 'Collaborative voyage' : 'Solo voyage'}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-accent" />
                <span>Budget</span>
              </span>
              <div className="font-semibold text-sm sm:text-base text-primary-text">
                {formatCurrency(trip.budgetAmount, trip.currency)}
              </div>
              <div className="text-[11px] text-secondary-text">
                {budgetPerPerson
                  ? `~${formatCurrency(budgetPerPerson, trip.currency)} / person`
                  : 'Total planned'}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl p-4 shadow-subtle space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-secondary-text font-medium flex items-center gap-1">
                <Map className="w-3.5 h-3.5 text-accent" />
                <span>Itinerary Canvas</span>
              </span>
              <div className="font-semibold text-sm sm:text-base text-primary-text">
                {trip.itineraryDays?.length || 0} Itinerary Days
              </div>
              <div className="text-[11px] text-secondary-text">
                {totalActivities} planned activities
              </div>
            </div>
          </div>

          {/* Section: Trip Companions & Membership */}
          <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-bg text-accent text-[10px] font-semibold uppercase tracking-wider mb-1">
                  <Users className="w-3 h-3" />
                  <span>Companion Circle</span>
                </div>
                <h2 className="font-semibold text-xl sm:text-2xl text-primary-text tracking-tight">
                  Travel Companions ({members.length})
                </h2>
                <p className="text-xs text-secondary-text mt-0.5">
                  Members who have co-access to the itinerary, activity suggestions, and
                  shared expense ledger.
                </p>
              </div>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedInviteUrl(null);
                    setInviteError(null);
                    setIsInviteModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle self-start"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Companions</span>
                </button>
              )}
            </div>

            {/* Confirmed Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((m) => {
                const isTargetOwner = m.role === 'OWNER';
                const isCurrentUser = m.userId === user?.id;

                return (
                  <div
                    key={m.id}
                    className="p-4 rounded-xl bg-background border border-border flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-accent-bg text-accent font-semibold flex items-center justify-center text-xs shrink-0">
                        {m.user?.name ? m.user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="truncate">
                        <div className="font-semibold text-xs text-primary-text flex items-center gap-1.5 truncate">
                          <span>{m.user?.name || 'Companion'}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] font-medium text-accent bg-accent-bg px-1.5 py-0.2 rounded">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-secondary-text truncate">
                          {m.user?.email}
                        </div>
                        <div className="text-[10px] text-secondary-text/80 mt-0.5">
                          Joined {new Date(m.joinedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isTargetOwner
                            ? 'bg-accent text-surface'
                            : 'bg-surface border border-border text-secondary-text'
                        }`}
                      >
                        {m.role}
                      </span>

                      {/* Remove member button for owner (cannot remove owner) */}
                      {isOwner && !isTargetOwner && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          disabled={removingMemberId === m.id}
                          className="p-1 rounded text-secondary-text hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove companion from trip"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pending Invitations Strip (Owner Only) */}
            {isOwner && pendingInvitations.length > 0 && (
              <div className="pt-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary-text flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-accent" />
                    <span>Pending Invitations ({pendingInvitations.length})</span>
                  </span>
                  <span className="text-[11px] text-secondary-text">
                    Awaiting companion confirmation
                  </span>
                </div>

                <div className="space-y-2">
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 rounded-lg bg-background border border-border flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span className="font-medium text-primary-text truncate">
                          {inv.email}
                        </span>
                        <span className="text-[11px] text-secondary-text">
                          Expires {new Date(inv.expiresAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 font-medium border border-amber-200">
                          Pending
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvitation(inv.id)}
                          className="text-[11px] text-secondary-text hover:text-rose-600 font-medium"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section: Itinerary Days Overview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-xl sm:text-2xl text-primary-text tracking-tight">
                  Day-by-Day Overview
                </h2>
                <p className="text-xs text-secondary-text mt-0.5">
                  Chronological schedule and activities generated for this journey.
                </p>
              </div>

              <Link
                href={`/trips/${trip.id}/itinerary`}
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
              >
                <span>Full Planner View</span>
                <span>→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(trip.itineraryDays || []).map((day) => {
                const dayDateFormatted = new Date(day.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });

                const dayActivities = day.activities || [];
                const dayCompleted = dayActivities.filter((a) => a.isCompleted).length;

                return (
                  <Link
                    key={day.id}
                    href={`/trips/${trip.id}/itinerary?day=${day.dayNumber}`}
                    className="bg-surface border border-border rounded-xl p-5 shadow-subtle hover:border-accent hover:shadow-card transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div>
                      {/* Day Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-border">
                        <span className="px-2.5 py-0.5 rounded-full bg-accent-bg text-accent text-xs font-semibold uppercase tracking-wider">
                          Day {day.dayNumber}
                        </span>
                        <span className="text-xs text-secondary-text">
                          {dayDateFormatted}
                        </span>
                      </div>

                      <h3 className="font-semibold text-base text-primary-text mt-3 group-hover:text-accent transition-colors line-clamp-1">
                        {day.title || `Day ${day.dayNumber} Exploration`}
                      </h3>

                      {day.notes && (
                        <p className="text-xs text-secondary-text mt-1 line-clamp-2 leading-relaxed">
                          {day.notes}
                        </p>
                      )}

                      {/* Activities Preview List */}
                      <div className="mt-3.5 space-y-2">
                        {dayActivities.slice(0, 3).map((act) => (
                          <div
                            key={act.id}
                            className="flex items-center gap-2 text-xs text-primary-text"
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                act.isCompleted ? 'bg-accent' : 'bg-border'
                              }`}
                            />
                            {act.startTime && (
                              <span className="text-[11px] text-secondary-text font-medium">
                                {formatTime(act.startTime)}
                              </span>
                            )}
                            <span className="truncate flex-1">{act.title}</span>
                          </div>
                        ))}

                        {dayActivities.length > 3 && (
                          <div className="text-[11px] text-secondary-text italic pt-1">
                            +{dayActivities.length - 3} more planned activities...
                          </div>
                        )}

                        {dayActivities.length === 0 && (
                          <div className="text-xs text-secondary-text italic py-2">
                            No stops planned yet. Click to add activities.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                      <span className="text-secondary-text">
                        {dayCompleted}/{dayActivities.length} stops completed
                      </span>
                      <span className="text-accent font-semibold group-hover:underline">
                        Plan Day →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section: Destination Snapshot */}
          {trip.destination && (
            <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-accent font-semibold">
                    Destination Dossier
                  </span>
                  <h3 className="font-semibold text-xl sm:text-2xl text-primary-text tracking-tight mt-0.5">
                    About {trip.destination.name}
                  </h3>
                  <p className="text-xs text-secondary-text flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-accent" />
                    <span>
                      {trip.destination.city}, {trip.destination.country}
                    </span>
                  </p>
                </div>

                <Link
                  href={`/destinations/${trip.destination.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-background border border-border text-primary-text text-xs font-medium hover:border-accent hover:text-accent transition-colors self-start"
                >
                  <Compass className="w-3.5 h-3.5 text-accent" />
                  <span>Full Destination Guide</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-2 space-y-4">
                  <p className="text-xs sm:text-sm text-secondary-text leading-relaxed">
                    {trip.destination.detailedDescription ||
                      trip.destination.shortDescription}
                  </p>

                  {/* Curated Attractions Tags */}
                  {trip.destination.attractions &&
                    trip.destination.attractions.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-semibold text-primary-text uppercase tracking-wider block">
                          Signature Highlights:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {trip.destination.attractions.map((attr, idx) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 rounded-md bg-background border border-border text-xs text-primary-text"
                            >
                              {attr}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>

                <div className="p-4 rounded-xl bg-background border border-border space-y-3 text-xs">
                  <div>
                    <span className="text-secondary-text block text-[11px]">
                      Best Season to Visit
                    </span>
                    <span className="font-medium text-primary-text">
                      {trip.destination.bestTimeToVisit}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-text block text-[11px]">
                      Recommended Stay
                    </span>
                    <span className="font-medium text-primary-text">
                      {trip.destination.approximateDuration}
                    </span>
                  </div>
                  <div>
                    <span className="text-secondary-text block text-[11px]">
                      Category
                    </span>
                    <span className="font-medium text-accent">
                      {trip.destination.category}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invite Companions Modal */}
          {isInviteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
                onClick={() => setIsInviteModalOpen(false)}
              />
              <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-lifted p-6 sm:p-8 z-10 space-y-5 animate-in fade-in-50 zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-accent" />
                    <h3 className="font-semibold text-xl text-primary-text">
                      Invite Travel Companions
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="p-1 rounded-md text-secondary-text hover:text-primary-text"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-secondary-text leading-relaxed">
                  Enter your travel partner&apos;s email address to generate an exclusive,
                  secure invitation link. Co-travelers can curate stops, suggest itinerary
                  activities, and log shared expenses.
                </p>

                {inviteError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                    {inviteError}
                  </div>
                )}

                <form onSubmit={handleCreateInvitation} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-primary-text mb-1">
                      Companion&apos;s Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. partner@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isInviting}
                    className="w-full py-2.5 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>
                      {isInviting
                        ? 'Generating Invitation...'
                        : 'Generate Invitation Link'}
                    </span>
                  </button>
                </form>

                {/* Generated Invitation Link Box */}
                {generatedInviteUrl && (
                  <div className="p-4 rounded-xl bg-accent-bg border border-accent/20 space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-accent">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Invitation Link Ready!</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedInviteUrl}
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-xs font-mono text-primary-text select-all focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(generatedInviteUrl)}
                        className="px-3 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors flex items-center gap-1.5 shrink-0 shadow-subtle"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    </div>

                    <p className="text-[11px] text-primary-text/80 leading-relaxed">
                      Share this private link directly with your companion. When they open
                      it, they can accept the invitation to access this journey.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Trip Modal */}
          {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
                onClick={() => !isUpdating && setIsEditModalOpen(false)}
              />
              <div className="relative w-full max-w-lg bg-surface border border-border rounded-xl shadow-lifted p-6 sm:p-8 z-10 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in-50 zoom-in-95">
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <h3 className="font-semibold text-xl text-primary-text">
                    Edit Journey Details
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-1 rounded-md text-secondary-text hover:text-primary-text"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpdateTrip} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary-text mb-1">
                      Trip Title <span className="text-accent">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-border text-primary-text text-sm focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary-text mb-1">
                      Description / Overview
                    </label>
                    <textarea
                      rows={3}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary-text mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        required
                        value={editStartDate}
                        onChange={(e) => setEditStartDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary-text mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        required
                        value={editEndDate}
                        onChange={(e) => setEditEndDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-secondary-text mb-1">
                        Travelers
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={editTravelers}
                        onChange={(e) =>
                          setEditTravelers(parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary-text mb-1">
                        Currency
                      </label>
                      <select
                        value={editCurrency}
                        onChange={(e) => setEditCurrency(e.target.value as Currency)}
                        className="w-full px-2 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {SUPPORTED_CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c} ({CURRENCY_SYMBOLS[c]})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary-text mb-1">
                        Budget
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={editBudget}
                        onChange={(e) => setEditBudget(e.target.value)}
                        placeholder="e.g. 150000"
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary-text mb-1">
                      Custom Cover Image URL
                    </label>
                    <input
                      type="url"
                      value={editCoverImage}
                      onChange={(e) => setEditCoverImage(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-3 py-2 rounded-lg bg-background border border-border text-primary-text text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => setIsEditModalOpen(false)}
                      className="px-4 py-2 rounded-md text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-5 py-2 rounded-md text-xs font-semibold text-surface bg-accent hover:bg-accent-hover transition-colors shadow-subtle flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isUpdating ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="fixed inset-0 bg-primary-text/40 backdrop-blur-xs transition-opacity"
                onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
              />
              <div className="relative w-full max-w-md bg-surface border border-border rounded-xl shadow-lifted p-6 z-10 space-y-4 animate-in fade-in-50 zoom-in-95">
                <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-primary-text">
                    Delete Journey
                  </h3>
                  <p className="text-xs text-secondary-text mt-1 leading-relaxed">
                    Are you sure you want to permanently delete &quot;{trip.title}&quot;?
                    All {trip.itineraryDays?.length || 0} itinerary days, companion links,
                    and expenses will be permanently erased.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2 rounded-md text-xs font-medium text-secondary-text hover:text-primary-text bg-background hover:bg-[#EFECE5]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteTrip}
                    className="px-4 py-2 rounded-md text-xs font-semibold text-surface bg-rose-600 hover:bg-rose-700 transition-colors shadow-subtle disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
