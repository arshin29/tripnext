'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  DollarSign,
  Edit2,
  Filter,
  Info,
  PieChart,
  Plus,
  Receipt,
  Sparkles,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  CURRENCY_SYMBOLS,
  EXPENSE_CATEGORIES,
  EXPENSE_SPLIT_METHODS,
  Expense,
  ExpenseCategory,
  ExpenseSplitMethod,
  GroupBalancesSummary,
  Trip,
  TripMember,
} from '@tripnest/shared';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { AppLayout } from '../../components/layout/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../lib/api-client';
import { formatCurrency } from '../../lib/trip-utils';

export default function ExpensesPage() {
  const { user } = useAuth();

  // Trips state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [isLoadingTrips, setIsLoadingTrips] = useState(true);

  // Selected trip expenses & balances data
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<GroupBalancesSummary | null>(null);
  const [tripMembers, setTripMembers] = useState<TripMember[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Modals & UI State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Food & Drinks');
  const [formAmount, setFormAmount] = useState('');
  const [formPaidById, setFormPaidById] = useState('');
  const [formExpenseDate, setFormExpenseDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [formSplitMethod, setFormSplitMethod] = useState<ExpenseSplitMethod>('EQUAL');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filter category
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Load user trips (owned + shared)
  const fetchTrips = useCallback(async () => {
    try {
      setIsLoadingTrips(true);
      const [ownedRes, sharedRes] = await Promise.all([
        apiClient<Trip[]>('/trips'),
        apiClient<Trip[]>('/trips/shared'),
      ]);

      const allTrips = [...(ownedRes.data || []), ...(sharedRes.data || [])];
      setTrips(allTrips);
      if (allTrips.length > 0 && !selectedTripId) {
        setSelectedTripId(allTrips[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load trips for expenses:', err);
    } finally {
      setIsLoadingTrips(false);
    }
  }, [selectedTripId]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Load details for selected trip
  const fetchTripFinancials = useCallback(async (tripId: string) => {
    if (!tripId) return;
    try {
      setIsLoadingDetails(true);
      const [expRes, balRes, memRes] = await Promise.all([
        apiClient<Expense[]>(`/trips/${tripId}/expenses`),
        apiClient<GroupBalancesSummary>(`/trips/${tripId}/expenses/balances`),
        apiClient<TripMember[]>(`/trips/${tripId}/members`),
      ]);

      if (expRes.data) setExpenses(expRes.data);
      if (balRes.data) setBalances(balRes.data);
      if (memRes.data) setTripMembers(memRes.data);
    } catch (err: any) {
      console.error('Failed to load trip expense details:', err);
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      fetchTripFinancials(selectedTripId);
    }
  }, [selectedTripId, fetchTripFinancials]);

  const currentTrip = useMemo(
    () => trips.find((t) => t.id === selectedTripId),
    [trips, selectedTripId],
  );

  // Setup Form for New Expense
  const openAddModal = () => {
    if (!currentTrip || tripMembers.length === 0) return;
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Food & Drinks');
    setFormAmount('');
    setFormPaidById(user?.id || tripMembers[0].userId);
    setFormExpenseDate(new Date().toISOString().split('T')[0]);
    setFormSplitMethod('EQUAL');

    const allMemberIds = tripMembers.map((m) => m.userId);
    setSelectedParticipantIds(allMemberIds);
    setCustomAmounts({});
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Setup Form for Editing Expense
  const openEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setFormTitle(exp.title);
    setFormDescription(exp.description || '');
    setFormCategory(exp.category);
    setFormAmount(String(exp.amount));
    setFormPaidById(exp.paidById);
    setFormExpenseDate(exp.expenseDate.split('T')[0]);
    setFormSplitMethod(exp.splitMethod);

    const participantIds = exp.splits.map((s) => s.userId);
    setSelectedParticipantIds(participantIds);

    const initialCustoms: Record<string, string> = {};
    for (const s of exp.splits) {
      initialCustoms[s.userId] = String(s.amount);
    }
    setCustomAmounts(initialCustoms);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Toggle participant for split
  const toggleParticipant = (userId: string) => {
    if (selectedParticipantIds.includes(userId)) {
      if (selectedParticipantIds.length <= 1) {
        return; // At least one participant required
      }
      setSelectedParticipantIds(selectedParticipantIds.filter((id) => id !== userId));
    } else {
      setSelectedParticipantIds([...selectedParticipantIds, userId]);
    }
  };

  // Calculations for live preview in split editor
  const parsedTotalAmount = parseFloat(formAmount) || 0;

  // Equal split live calculation
  const equalSplitShares = useMemo(() => {
    if (parsedTotalAmount <= 0 || selectedParticipantIds.length === 0) return {};
    const totalCents = Math.round(parsedTotalAmount * 100);
    const n = selectedParticipantIds.length;
    const baseCents = Math.floor(totalCents / n);
    let remainder = totalCents - baseCents * n;

    const shares: Record<string, number> = {};
    for (const id of selectedParticipantIds) {
      let cents = baseCents;
      if (remainder > 0) {
        cents += 1;
        remainder -= 1;
      }
      shares[id] = cents / 100;
    }
    return shares;
  }, [parsedTotalAmount, selectedParticipantIds]);

  // Custom split sum and difference calculation
  const customSplitSum = useMemo(() => {
    let sum = 0;
    for (const id of selectedParticipantIds) {
      const val = parseFloat(customAmounts[id]) || 0;
      sum += Math.round(val * 100);
    }
    return sum / 100;
  }, [selectedParticipantIds, customAmounts]);

  const customDifference = useMemo(() => {
    const diffCents =
      Math.round(parsedTotalAmount * 100) - Math.round(customSplitSum * 100);
    return diffCents / 100;
  }, [parsedTotalAmount, customSplitSum]);

  // Submit Expense Create/Update
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim()) {
      setFormError('Expense title is required.');
      return;
    }
    if (parsedTotalAmount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    if (selectedParticipantIds.length === 0) {
      setFormError('Please select at least one participant.');
      return;
    }

    let splitsPayload: { userId: string; amount?: number }[] = [];
    if (formSplitMethod === 'EQUAL') {
      splitsPayload = selectedParticipantIds.map((userId) => ({ userId }));
    } else {
      if (Math.abs(customDifference) > 0.001) {
        setFormError(
          `The sum of custom shares (${formatCurrency(customSplitSum, currentTrip?.currency)}) does not match the total expense (${formatCurrency(parsedTotalAmount, currentTrip?.currency)}). Difference: ${formatCurrency(Math.abs(customDifference), currentTrip?.currency)}.`,
        );
        return;
      }
      splitsPayload = selectedParticipantIds.map((userId) => ({
        userId,
        amount: parseFloat(customAmounts[userId]) || 0,
      }));
    }

    try {
      setIsSubmitting(true);
      if (editingExpense) {
        // Update
        await apiClient(`/trips/${selectedTripId}/expenses/${editingExpense.id}`, {
          method: 'PATCH',
          body: {
            title: formTitle,
            description: formDescription,
            category: formCategory,
            amount: parsedTotalAmount,
            currency: currentTrip?.currency,
            paidById: formPaidById,
            expenseDate: formExpenseDate,
            splitMethod: formSplitMethod,
            splits: splitsPayload,
          },
        });
        showToast('Expense updated successfully.');
        setIsEditModalOpen(false);
      } else {
        // Create
        await apiClient(`/trips/${selectedTripId}/expenses`, {
          method: 'POST',
          body: {
            title: formTitle,
            description: formDescription,
            category: formCategory,
            amount: parsedTotalAmount,
            currency: currentTrip?.currency,
            paidById: formPaidById,
            expenseDate: formExpenseDate,
            splitMethod: formSplitMethod,
            splits: splitsPayload,
          },
        });
        showToast('Expense logged successfully.');
        setIsAddModalOpen(false);
      }

      await fetchTripFinancials(selectedTripId);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async () => {
    if (!deletingExpenseId) return;
    try {
      setIsSubmitting(true);
      await apiClient(`/trips/${selectedTripId}/expenses/${deletingExpenseId}`, {
        method: 'DELETE',
      });
      showToast('Expense deleted.');
      setIsDeleteModalOpen(false);
      setDeletingExpenseId(null);
      await fetchTripFinancials(selectedTripId);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredExpenses = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return expenses;
    return expenses.filter((e) => e.category === selectedCategoryFilter);
  }, [expenses, selectedCategoryFilter]);

  const currencySymbol = CURRENCY_SYMBOLS[currentTrip?.currency || 'INR'] || '₹';

  return (
    <ProtectedRoute>
      <AppLayout
        pageTitle="Expenses"
        pageSubtitle="Shared travel spending, split calculations, and settlement balances"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-bg text-accent text-xs font-semibold uppercase tracking-wider mb-2">
                <Receipt className="w-3.5 h-3.5" />
                <span>Financial Ledger</span>
              </div>
              <h1 className="font-semibold text-3xl sm:text-4xl text-primary-text tracking-tight">
                Travel Expenses
              </h1>
              <p className="text-xs sm:text-sm text-secondary-text mt-1">
                Keep group expenses transparent with fair splits and multi-currency
                tracking.
              </p>
            </div>

            {/* Trip Selector & Primary Action */}
            <div className="flex items-center gap-3">
              {trips.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    className="appearance-none bg-surface border border-border rounded-lg pl-3 pr-8 py-2 text-xs font-medium text-primary-text hover:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.currency})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-secondary-text absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}

              <button
                onClick={openAddModal}
                disabled={!currentTrip}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Record Expense</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3 rounded-lg bg-accent-bg border border-accent/20 flex items-center gap-2 text-xs text-primary-text font-medium">
              <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* No Trips Available */}
          {!isLoadingTrips && trips.length === 0 && (
            <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-subtle">
              <Receipt className="w-8 h-8 text-secondary-text mx-auto mb-3" />
              <h3 className="font-semibold text-xl text-primary-text">
                No trips initialized
              </h3>
              <p className="text-xs text-secondary-text mt-1 max-w-sm mx-auto">
                Create a journey first from your overview to log accommodations, dinners,
                or transport expenses.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors mt-4"
              >
                <span>Go to Dashboard</span>
              </Link>
            </div>
          )}

          {/* Selected Trip Details */}
          {currentTrip && (
            <div className="space-y-8">
              {/* Financial Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-surface border border-border rounded-xl p-5 shadow-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">
                      Total Trip Spend
                    </span>
                    <Wallet className="w-4 h-4 text-accent" />
                  </div>
                  <div className="font-semibold text-2xl sm:text-3xl text-primary-text mt-2 tracking-tight">
                    {formatCurrency(
                      balances?.totalTripExpenses || 0,
                      currentTrip.currency,
                    )}
                  </div>
                  <p className="text-[11px] text-secondary-text mt-1">
                    {expenses.length} logged{' '}
                    {expenses.length === 1 ? 'transaction' : 'transactions'}
                  </p>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5 shadow-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">
                      You Paid
                    </span>
                    <CreditCard className="w-4 h-4 text-accent" />
                  </div>
                  <div className="font-semibold text-2xl sm:text-3xl text-primary-text mt-2 tracking-tight">
                    {formatCurrency(balances?.currentUserPaid || 0, currentTrip.currency)}
                  </div>
                  <p className="text-[11px] text-secondary-text mt-1">
                    Your share:{' '}
                    {formatCurrency(
                      balances?.currentUserShare || 0,
                      currentTrip.currency,
                    )}
                  </p>
                </div>

                <div className="bg-surface border border-border rounded-xl p-5 shadow-subtle">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary-text">
                      Your Net Balance
                    </span>
                    {(balances?.currentUserNetBalance || 0) > 0 ? (
                      <TrendingUp className="w-4 h-4 text-emerald-600" />
                    ) : (balances?.currentUserNetBalance || 0) < 0 ? (
                      <TrendingDown className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div
                    className={`font-semibold text-2xl sm:text-3xl mt-2 tracking-tight ${
                      (balances?.currentUserNetBalance || 0) > 0
                        ? 'text-emerald-700'
                        : (balances?.currentUserNetBalance || 0) < 0
                          ? 'text-rose-700'
                          : 'text-primary-text'
                    }`}
                  >
                    {(balances?.currentUserNetBalance || 0) > 0 ? '+' : ''}
                    {formatCurrency(
                      balances?.currentUserNetBalance || 0,
                      currentTrip.currency,
                    )}
                  </div>
                  <p className="text-[11px] text-secondary-text mt-1">
                    {(balances?.currentUserNetBalance || 0) > 0
                      ? 'You are owed money'
                      : (balances?.currentUserNetBalance || 0) < 0
                        ? 'You owe the group'
                        : 'All settled up'}
                  </p>
                </div>
              </div>

              {/* Balances & Settlement Suggestions Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Member Net Balances */}
                <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-accent" />
                      <h3 className="font-semibold text-sm sm:text-base text-primary-text">
                        Companion Balances
                      </h3>
                    </div>
                    <span className="text-[11px] text-secondary-text font-medium">
                      {tripMembers.length} Members
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(balances?.members || []).map((m) => {
                      const isPositive = m.netBalance > 0.005;
                      const isNegative = m.netBalance < -0.005;
                      const isCurrent = m.userId === user?.id;

                      return (
                        <div
                          key={m.userId}
                          className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-accent-bg text-accent font-semibold flex items-center justify-center text-xs shrink-0">
                              {m.userName.charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                              <div className="font-medium text-xs text-primary-text flex items-center gap-1.5 truncate">
                                <span>{m.userName}</span>
                                {isCurrent && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-accent-bg text-accent font-medium">
                                    You
                                  </span>
                                )}
                                {m.role === 'OWNER' && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-background border border-border text-secondary-text uppercase">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-secondary-text">
                                Paid: {formatCurrency(m.totalPaid, currentTrip.currency)}{' '}
                                | Share:{' '}
                                {formatCurrency(m.totalOwed, currentTrip.currency)}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                                isPositive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : isNegative
                                    ? 'bg-rose-50 text-rose-700'
                                    : 'bg-background text-secondary-text border border-border'
                              }`}
                            >
                              {isPositive ? '+' : ''}
                              {formatCurrency(m.netBalance, currentTrip.currency)}
                            </span>
                            <div className="text-[10px] text-secondary-text mt-0.5">
                              {isPositive
                                ? 'to receive'
                                : isNegative
                                  ? 'owes'
                                  : 'settled'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Simplified Settlements */}
                <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-accent" />
                      <h3 className="font-semibold text-sm sm:text-base text-primary-text">
                        Suggested Settlements
                      </h3>
                    </div>
                    <span className="text-[11px] text-secondary-text">
                      Minimizes transfer steps
                    </span>
                  </div>

                  {!balances?.settlements || balances.settlements.length === 0 ? (
                    <div className="py-8 text-center text-xs text-secondary-text space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-accent mx-auto" />
                      <p className="font-semibold text-primary-text">
                        All accounts are settled
                      </p>
                      <p className="text-[11px]">
                        No debt transfers are currently required.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {balances.settlements.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                        >
                          <div className="flex items-center gap-2 text-xs text-primary-text min-w-0">
                            <span className="font-semibold truncate">
                              {s.fromUserName}
                            </span>
                            <span className="text-secondary-text">pays</span>
                            <span className="font-semibold truncate">{s.toUserName}</span>
                          </div>
                          <span className="font-bold text-xs text-accent px-2 py-1 rounded bg-accent-bg shrink-0">
                            {formatCurrency(s.amount, s.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-background border border-border text-[11px] text-secondary-text flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <span>
                      Settlements are informational calculations only. Coordinate
                      peer-to-peer or cash payments directly with companions.
                    </span>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              {balances && balances.categoryBreakdown.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-5 sm:p-6 shadow-subtle space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-border">
                    <PieChart className="w-4 h-4 text-accent" />
                    <h3 className="font-semibold text-sm sm:text-base text-primary-text">
                      Spending by Category
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {balances.categoryBreakdown.map((cat) => (
                      <div
                        key={cat.category}
                        className="p-3 rounded-lg bg-background border border-border space-y-1"
                      >
                        <div className="text-[11px] text-secondary-text font-medium truncate">
                          {cat.category}
                        </div>
                        <div className="font-semibold text-sm text-primary-text">
                          {formatCurrency(cat.amount, currentTrip.currency)}
                        </div>
                        <div className="text-[10px] text-accent font-semibold">
                          {cat.percentage}% of total
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses List Section */}
              <div className="bg-surface border border-border rounded-xl shadow-subtle overflow-hidden space-y-4 p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                  <div>
                    <h3 className="font-semibold text-lg text-primary-text">
                      Transaction Ledger
                    </h3>
                    <p className="text-xs text-secondary-text mt-0.5">
                      Itemized list of shared stays, meals, rides, and activities.
                    </p>
                  </div>

                  {/* Category Filter */}
                  <div className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-secondary-text" />
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                      className="bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-primary-text focus:outline-none"
                    >
                      <option value="ALL">All Categories</option>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredExpenses.length === 0 ? (
                  <div className="py-12 text-center text-xs text-secondary-text space-y-2">
                    <Receipt className="w-8 h-8 text-secondary-text mx-auto opacity-50" />
                    <p className="font-semibold text-primary-text">No expenses found</p>
                    <p>
                      Click &ldquo;Record Expense&rdquo; above to log the first group
                      purchase.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredExpenses.map((exp) => {
                      const isCreator = exp.paidById === user?.id;
                      const isTripOwner =
                        currentTrip.isOwner || currentTrip.userId === user?.id;
                      const canManage = isCreator || isTripOwner;

                      return (
                        <div
                          key={exp.id}
                          className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-primary-text">
                                {exp.title}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-accent-bg text-accent text-[10px] font-semibold uppercase tracking-wider">
                                {exp.category}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-background border border-border text-secondary-text font-medium">
                                {exp.splitMethod === 'EQUAL'
                                  ? 'Equal Split'
                                  : 'Custom Split'}
                              </span>
                            </div>

                            <div className="text-xs text-secondary-text flex items-center gap-3 flex-wrap">
                              <span>
                                Paid by{' '}
                                <strong className="text-primary-text">
                                  {exp.paidBy.name}
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                {new Date(exp.expenseDate).toLocaleDateString()}
                              </span>
                              <span>•</span>
                              <span>{exp.splits.length} participants</span>
                            </div>

                            {exp.description && (
                              <p className="text-xs text-secondary-text mt-1">
                                {exp.description}
                              </p>
                            )}

                            {/* Splits preview pills */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {exp.splits.map((s) => (
                                <span
                                  key={s.id}
                                  className="text-[11px] px-2 py-0.5 rounded bg-background border border-border text-secondary-text"
                                >
                                  {s.user?.name || 'Companion'}:{' '}
                                  <strong className="text-primary-text">
                                    {formatCurrency(s.amount, exp.currency)}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                            <div className="font-bold text-base sm:text-lg text-primary-text">
                              {formatCurrency(exp.amount, exp.currency)}
                            </div>

                            {canManage && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => openEditModal(exp)}
                                  className="p-1.5 rounded hover:bg-background text-secondary-text hover:text-accent transition-colors"
                                  title="Edit Expense"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingExpenseId(exp.id);
                                    setIsDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 rounded hover:bg-red-50 text-secondary-text hover:text-red-600 transition-colors"
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add / Edit Expense Modal */}
          {(isAddModalOpen || isEditModalOpen) && (
            <div className="fixed inset-0 z-50 bg-primary-text/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface border border-border rounded-2xl shadow-card max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-accent" />
                    <h3 className="font-semibold text-lg text-primary-text">
                      {isEditModalOpen ? 'Edit Travel Expense' : 'Record New Expense'}
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setIsEditModalOpen(false);
                    }}
                    className="p-1 rounded-md text-secondary-text hover:text-primary-text"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
                  {formError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 leading-relaxed">
                      {formError}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold text-primary-text mb-1">
                      Expense Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Dinner at trattoria, Villa rental, Ferry tickets"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-primary-text focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  {/* Amount & Category Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-primary-text mb-1">
                        Amount ({currentTrip?.currency}) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-primary-text focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-primary-text mb-1">
                        Category *
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) =>
                          setFormCategory(e.target.value as ExpenseCategory)
                        }
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-primary-text focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {EXPENSE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Paid By & Date Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-primary-text mb-1">
                        Paid By *
                      </label>
                      <select
                        value={formPaidById}
                        onChange={(e) => setFormPaidById(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-primary-text focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {tripMembers.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user?.name || m.userId}{' '}
                            {m.userId === user?.id ? '(You)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-primary-text mb-1">
                        Expense Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formExpenseDate}
                        onChange={(e) => setFormExpenseDate(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-primary-text focus:outline-none focus:ring-1 focus:ring-accent"
                      />
                    </div>
                  </div>

                  {/* Split Method Toggle */}
                  <div>
                    <label className="block text-xs font-semibold text-primary-text mb-1">
                      Split Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormSplitMethod('EQUAL')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                          formSplitMethod === 'EQUAL'
                            ? 'bg-accent text-surface border-accent'
                            : 'bg-background text-primary-text border-border hover:border-accent'
                        }`}
                      >
                        Equal Split
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormSplitMethod('CUSTOM')}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                          formSplitMethod === 'CUSTOM'
                            ? 'bg-accent text-surface border-accent'
                            : 'bg-background text-primary-text border-border hover:border-accent'
                        }`}
                      >
                        Custom Split
                      </button>
                    </div>
                  </div>

                  {/* Participants Selector & Split Allocator */}
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-primary-text">
                        Included Companions ({selectedParticipantIds.length} of{' '}
                        {tripMembers.length})
                      </span>
                      {formSplitMethod === 'CUSTOM' && (
                        <span
                          className={`text-xs font-semibold ${
                            Math.abs(customDifference) < 0.005
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {Math.abs(customDifference) < 0.005
                            ? 'Exact match ✓'
                            : `Difference: ${formatCurrency(customDifference, currentTrip?.currency)}`}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {tripMembers.map((m) => {
                        const isSelected = selectedParticipantIds.includes(m.userId);
                        const equalShare = isSelected
                          ? equalSplitShares[m.userId] || 0
                          : 0;

                        return (
                          <div
                            key={m.userId}
                            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-background border-accent/40'
                                : 'bg-surface border-border opacity-60'
                            }`}
                          >
                            <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleParticipant(m.userId)}
                                className="rounded text-accent focus:ring-accent"
                              />
                              <span className="font-medium text-primary-text truncate">
                                {m.user?.name} {m.userId === user?.id ? '(You)' : ''}
                              </span>
                            </label>

                            {isSelected && (
                              <div className="w-32 shrink-0 text-right">
                                {formSplitMethod === 'EQUAL' ? (
                                  <span className="font-semibold text-primary-text">
                                    {formatCurrency(equalShare, currentTrip?.currency)}
                                  </span>
                                ) : (
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={customAmounts[m.userId] || ''}
                                    onChange={(e) =>
                                      setCustomAmounts({
                                        ...customAmounts,
                                        [m.userId]: e.target.value,
                                      })
                                    }
                                    className="w-full text-right bg-surface border border-border rounded px-2 py-1 text-xs text-primary-text focus:outline-none focus:ring-1 focus:ring-accent"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddModalOpen(false);
                        setIsEditModalOpen(false);
                      }}
                      className="px-4 py-2 rounded-lg bg-background border border-border text-secondary-text text-xs font-medium hover:text-primary-text transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-lg bg-accent text-surface text-xs font-semibold hover:bg-accent-hover transition-colors shadow-subtle disabled:opacity-50"
                    >
                      {isSubmitting
                        ? 'Saving...'
                        : isEditModalOpen
                          ? 'Update Expense'
                          : 'Record Expense'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-50 bg-primary-text/40 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-surface border border-border rounded-xl p-6 max-w-sm w-full space-y-4 shadow-card">
                <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Expense</span>
                </div>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Are you sure you want to delete this expense? All split records will be
                  permanently removed and companion balances will be recalculated.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setDeletingExpenseId(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-background border border-border text-secondary-text text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteExpense}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 text-surface text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete'}
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
