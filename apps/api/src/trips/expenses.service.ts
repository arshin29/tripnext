import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CategoryExpenseBreakdown,
  Expense,
  ExpenseCategory,
  ExpenseSplitMethod,
  GroupBalancesSummary,
  MemberBalance,
  SafeUser,
  SettlementSuggestion,
  TripMemberRole,
} from '@tripnest/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationService } from './collaboration.service';
import { CreateExpenseDto, ExpenseSplitDto, UpdateExpenseDto } from './dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collaborationService: CollaborationService,
  ) {}

  private toSafeUser(user: {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    updatedAt: Date;
  }): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  /**
   * Safe financial cents calculation to prevent floating point inaccuracies.
   */
  toCents(amount: number): number {
    return Math.round(Number(amount) * 100);
  }

  fromCents(cents: number): number {
    return Number((cents / 100).toFixed(2));
  }

  /**
   * Deterministic equal split algorithm.
   * Remainder cents are allocated one-by-one to early members so that:
   * sum(splits) === total exactly.
   */
  calculateEqualSplits(
    totalAmount: number,
    memberUserIds: string[],
  ): { userId: string; amount: number }[] {
    const totalCents = this.toCents(totalAmount);
    const n = memberUserIds.length;
    if (n === 0) {
      throw new BadRequestException(
        'At least one member must be selected for equal split.',
      );
    }

    const baseCents = Math.floor(totalCents / n);
    let remainderCents = totalCents - baseCents * n;

    return memberUserIds.map((userId) => {
      let cents = baseCents;
      if (remainderCents > 0) {
        cents += 1;
        remainderCents -= 1;
      }
      return {
        userId,
        amount: this.fromCents(cents),
      };
    });
  }

  /**
   * Validate custom split shares.
   * Asserts that all amounts are non-negative and their sum equals total amount exactly.
   */
  validateCustomSplits(
    totalAmount: number,
    splits: ExpenseSplitDto[],
  ): { userId: string; amount: number }[] {
    const totalCents = this.toCents(totalAmount);
    let splitSumCents = 0;

    const validated = splits.map((s) => {
      if (s.amount === undefined || s.amount === null || isNaN(s.amount)) {
        throw new BadRequestException(
          `Split amount for participant ${s.userId} is required.`,
        );
      }
      if (s.amount < 0) {
        throw new BadRequestException('Split amounts cannot be negative.');
      }
      const cents = this.toCents(s.amount);
      splitSumCents += cents;
      return {
        userId: s.userId,
        amount: this.fromCents(cents),
      };
    });

    if (splitSumCents !== totalCents) {
      const expected = (totalCents / 100).toFixed(2);
      const actual = (splitSumCents / 100).toFixed(2);
      throw new BadRequestException(
        `The sum of all custom splits (${actual}) must equal the total expense amount (${expected}) exactly.`,
      );
    }

    return validated;
  }

  /**
   * Format Prisma Expense record to shared Expense interface.
   */
  private formatExpense(record: any): Expense {
    return {
      id: record.id,
      tripId: record.tripId,
      paidById: record.paidById,
      title: record.title,
      description: record.description,
      category: record.category as ExpenseCategory,
      amount: Number(record.amount),
      currency: record.currency,
      expenseDate: record.expenseDate.toISOString(),
      splitMethod: record.splitMethod as ExpenseSplitMethod,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      paidBy: this.toSafeUser(record.paidBy),
      splits: (record.splits || []).map((s: any) => ({
        id: s.id,
        expenseId: s.expenseId,
        userId: s.userId,
        amount: Number(s.amount),
        user: s.user ? this.toSafeUser(s.user) : undefined,
      })),
    };
  }

  /**
   * Create a new expense with equal or custom split shares.
   */
  async createExpense(
    userId: string,
    tripId: string,
    dto: CreateExpenseDto,
  ): Promise<Expense> {
    const { trip } = await this.collaborationService.validateTripAccess(userId, tripId);

    // Validate currency matches trip configured currency
    if (dto.currency && dto.currency !== trip.currency) {
      throw new BadRequestException(
        `Expense currency (${dto.currency}) must match the trip currency (${trip.currency}).`,
      );
    }
    const currency = trip.currency;

    // Validate trip members
    const tripMembers = await this.prisma.tripMember.findMany({
      where: { tripId },
      include: { user: true },
    });
    const validMemberIds = new Set(tripMembers.map((m) => m.userId));

    if (!validMemberIds.has(dto.paidById)) {
      throw new BadRequestException(
        'Paying member must be an active member of this trip.',
      );
    }

    // Check unique participant IDs in splits
    const participantIds = dto.splits.map((s) => s.userId);
    const uniqueParticipantIds = new Set(participantIds);
    if (uniqueParticipantIds.size !== participantIds.length) {
      throw new BadRequestException(
        'Duplicate participants in expense splits are not allowed.',
      );
    }

    for (const pid of participantIds) {
      if (!validMemberIds.has(pid)) {
        throw new BadRequestException(
          `Participant '${pid}' is not a member of this trip.`,
        );
      }
    }

    // Compute splits based on method
    let resolvedSplits: { userId: string; amount: number }[] = [];
    if (dto.splitMethod === 'EQUAL') {
      resolvedSplits = this.calculateEqualSplits(dto.amount, participantIds);
    } else {
      resolvedSplits = this.validateCustomSplits(dto.amount, dto.splits);
    }

    const expenseDate = new Date(dto.expenseDate);
    if (isNaN(expenseDate.getTime())) {
      throw new BadRequestException('Invalid expense date format.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const exp = await tx.expense.create({
        data: {
          tripId,
          paidById: dto.paidById,
          title: dto.title.trim(),
          description: dto.description?.trim(),
          category: dto.category,
          amount: new Prisma.Decimal(dto.amount),
          currency,
          expenseDate,
          splitMethod: dto.splitMethod,
          splits: {
            create: resolvedSplits.map((s) => ({
              userId: s.userId,
              amount: new Prisma.Decimal(s.amount),
            })),
          },
        },
        include: {
          paidBy: true,
          splits: {
            include: { user: true },
          },
        },
      });

      return exp;
    });

    return this.formatExpense(created);
  }

  /**
   * List all expenses for a trip.
   */
  async getTripExpenses(userId: string, tripId: string): Promise<Expense[]> {
    await this.collaborationService.validateTripAccess(userId, tripId);

    const expenses = await this.prisma.expense.findMany({
      where: { tripId },
      include: {
        paidBy: true,
        splits: {
          include: { user: true },
        },
      },
      orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    });

    return expenses.map((e) => this.formatExpense(e));
  }

  /**
   * Get single expense by ID.
   */
  async getExpenseById(
    userId: string,
    tripId: string,
    expenseId: string,
  ): Promise<Expense> {
    await this.collaborationService.validateTripAccess(userId, tripId);

    const expense = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId },
      include: {
        paidBy: true,
        splits: {
          include: { user: true },
        },
      },
    });

    if (!expense) {
      throw new NotFoundException(`Expense with ID '${expenseId}' was not found.`);
    }

    return this.formatExpense(expense);
  }

  /**
   * Update an existing expense (Owner or expense creator only).
   */
  async updateExpense(
    userId: string,
    tripId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    const { role } = await this.collaborationService.validateTripAccess(userId, tripId);

    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId },
      include: { splits: true },
    });

    if (!existing) {
      throw new NotFoundException(`Expense with ID '${expenseId}' was not found.`);
    }

    // Permissions: Creator or Owner
    const isCreator = existing.paidById === userId;
    const isOwner = role === 'OWNER';
    if (!isCreator && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to modify this expense. Only the creator or trip owner can update it.',
      );
    }

    const tripMembers = await this.prisma.tripMember.findMany({
      where: { tripId },
      include: { user: true },
    });
    const validMemberIds = new Set(tripMembers.map((m) => m.userId));

    const targetAmount = dto.amount !== undefined ? dto.amount : Number(existing.amount);
    const targetPaidById = dto.paidById || existing.paidById;
    if (!validMemberIds.has(targetPaidById)) {
      throw new BadRequestException(
        'Paying member must be an active member of this trip.',
      );
    }

    const targetSplitMethod =
      dto.splitMethod || (existing.splitMethod as ExpenseSplitMethod);

    // If splits or amount or splitMethod changed, re-calculate splits
    let resolvedSplits: { userId: string; amount: number }[] | null = null;
    if (dto.splits || dto.amount !== undefined || dto.splitMethod) {
      const inputSplits =
        dto.splits ||
        existing.splits.map((s) => ({ userId: s.userId, amount: Number(s.amount) }));
      const participantIds = inputSplits.map((s) => s.userId);
      const uniqueParticipantIds = new Set(participantIds);
      if (uniqueParticipantIds.size !== participantIds.length) {
        throw new BadRequestException(
          'Duplicate participants in expense splits are not allowed.',
        );
      }
      for (const pid of participantIds) {
        if (!validMemberIds.has(pid)) {
          throw new BadRequestException(
            `Participant '${pid}' is not a member of this trip.`,
          );
        }
      }

      if (targetSplitMethod === 'EQUAL') {
        resolvedSplits = this.calculateEqualSplits(targetAmount, participantIds);
      } else {
        resolvedSplits = this.validateCustomSplits(targetAmount, inputSplits);
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.ExpenseUpdateInput = {};
      if (dto.title !== undefined) updateData.title = dto.title.trim();
      if (dto.description !== undefined) updateData.description = dto.description.trim();
      if (dto.category !== undefined) updateData.category = dto.category;
      if (dto.amount !== undefined) updateData.amount = new Prisma.Decimal(dto.amount);
      if (dto.paidById !== undefined)
        updateData.paidBy = { connect: { id: dto.paidById } };
      if (dto.expenseDate !== undefined)
        updateData.expenseDate = new Date(dto.expenseDate);
      if (dto.splitMethod !== undefined) updateData.splitMethod = dto.splitMethod;

      if (resolvedSplits) {
        // Delete old splits and create new ones
        await tx.expenseSplit.deleteMany({
          where: { expenseId },
        });
        await tx.expenseSplit.createMany({
          data: resolvedSplits.map((s) => ({
            expenseId,
            userId: s.userId,
            amount: new Prisma.Decimal(s.amount),
          })),
        });
      }

      return tx.expense.update({
        where: { id: expenseId },
        data: updateData,
        include: {
          paidBy: true,
          splits: {
            include: { user: true },
          },
        },
      });
    });

    return this.formatExpense(updated);
  }

  /**
   * Delete an expense (Owner or expense creator only).
   */
  async deleteExpense(
    userId: string,
    tripId: string,
    expenseId: string,
  ): Promise<{ success: boolean; expenseId: string }> {
    const { role } = await this.collaborationService.validateTripAccess(userId, tripId);

    const existing = await this.prisma.expense.findFirst({
      where: { id: expenseId, tripId },
    });

    if (!existing) {
      throw new NotFoundException(`Expense with ID '${expenseId}' was not found.`);
    }

    const isCreator = existing.paidById === userId;
    const isOwner = role === 'OWNER';
    if (!isCreator && !isOwner) {
      throw new ForbiddenException(
        'You do not have permission to delete this expense. Only the creator or trip owner can delete it.',
      );
    }

    await this.prisma.expense.delete({
      where: { id: expenseId },
    });

    return { success: true, expenseId };
  }

  /**
   * Compute simplified debt settlements.
   * Matches biggest debtors with biggest creditors deterministically.
   */
  computeSettlementSuggestions(
    memberBalances: MemberBalance[],
    currency: string,
  ): SettlementSuggestion[] {
    // Work in integer cents to completely avoid floating-point errors
    const creditors = memberBalances
      .filter((m) => this.toCents(m.netBalance) > 0)
      .map((m) => ({
        userId: m.userId,
        userName: m.userName,
        cents: this.toCents(m.netBalance),
      }))
      .sort((a, b) => b.cents - a.cents);

    const debtors = memberBalances
      .filter((m) => this.toCents(m.netBalance) < 0)
      .map((m) => ({
        userId: m.userId,
        userName: m.userName,
        cents: -this.toCents(m.netBalance), // positive amount owed
      }))
      .sort((a, b) => b.cents - a.cents);

    const settlements: SettlementSuggestion[] = [];
    let creditorIdx = 0;
    let debtorIdx = 0;

    while (creditorIdx < creditors.length && debtorIdx < debtors.length) {
      const creditor = creditors[creditorIdx];
      const debtor = debtors[debtorIdx];

      if (creditor.cents === 0) {
        creditorIdx++;
        continue;
      }
      if (debtor.cents === 0) {
        debtorIdx++;
        continue;
      }

      const transferCents = Math.min(creditor.cents, debtor.cents);
      settlements.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.userName,
        toUserId: creditor.userId,
        toUserName: creditor.userName,
        amount: this.fromCents(transferCents),
        currency,
      });

      creditor.cents -= transferCents;
      debtor.cents -= transferCents;

      if (creditor.cents === 0) {
        creditorIdx++;
      }
      if (debtor.cents === 0) {
        debtorIdx++;
      }
    }

    return settlements;
  }

  /**
   * Calculate group balances, total trip spend, member net positions, and settlement plan.
   */
  async getGroupBalances(userId: string, tripId: string): Promise<GroupBalancesSummary> {
    const { trip } = await this.collaborationService.validateTripAccess(userId, tripId);

    const [members, expenses] = await Promise.all([
      this.prisma.tripMember.findMany({
        where: { tripId },
        include: { user: true },
        orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
      }),
      this.prisma.expense.findMany({
        where: { tripId },
        include: {
          splits: true,
        },
      }),
    ]);

    // Member balance map (all calculations in cents)
    const paidByMemberCents = new Map<string, number>();
    const owedByMemberCents = new Map<string, number>();
    const categoryTotalsCents = new Map<string, number>();

    for (const m of members) {
      paidByMemberCents.set(m.userId, 0);
      owedByMemberCents.set(m.userId, 0);
    }

    let totalTripExpensesCents = 0;

    for (const exp of expenses) {
      const expCents = this.toCents(Number(exp.amount));
      totalTripExpensesCents += expCents;

      // Paid by
      const currentPaid = paidByMemberCents.get(exp.paidById) || 0;
      paidByMemberCents.set(exp.paidById, currentPaid + expCents);

      // Category breakdown
      const catCurrent = categoryTotalsCents.get(exp.category) || 0;
      categoryTotalsCents.set(exp.category, catCurrent + expCents);

      // Splits
      for (const s of exp.splits) {
        const splitCents = this.toCents(Number(s.amount));
        const currentOwed = owedByMemberCents.get(s.userId) || 0;
        owedByMemberCents.set(s.userId, currentOwed + splitCents);
      }
    }

    const memberBalances: MemberBalance[] = members.map((m) => {
      const totalPaidCents = paidByMemberCents.get(m.userId) || 0;
      const totalOwedCents = owedByMemberCents.get(m.userId) || 0;
      const netCents = totalPaidCents - totalOwedCents;

      return {
        userId: m.userId,
        userName: m.user.name,
        userEmail: m.user.email,
        role: m.role as TripMemberRole,
        totalPaid: this.fromCents(totalPaidCents),
        totalOwed: this.fromCents(totalOwedCents),
        netBalance: this.fromCents(netCents),
      };
    });

    // Current user's totals
    const userPaidCents = paidByMemberCents.get(userId) || 0;
    const userOwedCents = owedByMemberCents.get(userId) || 0;
    const userNetCents = userPaidCents - userOwedCents;

    // Category breakdown with percentages
    const categoryBreakdown: CategoryExpenseBreakdown[] = Array.from(
      categoryTotalsCents.entries(),
    ).map(([category, amountCents]) => ({
      category: category as ExpenseCategory,
      amount: this.fromCents(amountCents),
      percentage:
        totalTripExpensesCents > 0
          ? Number(((amountCents / totalTripExpensesCents) * 100).toFixed(1))
          : 0,
    }));

    const settlements = this.computeSettlementSuggestions(memberBalances, trip.currency);

    return {
      tripId,
      currency: trip.currency,
      totalTripExpenses: this.fromCents(totalTripExpensesCents),
      currentUserPaid: this.fromCents(userPaidCents),
      currentUserShare: this.fromCents(userOwedCents),
      currentUserNetBalance: this.fromCents(userNetCents),
      members: memberBalances,
      settlements,
      categoryBreakdown,
    };
  }

  /**
   * User-wide overall expenses summary across all trips the user belongs to.
   */
  async getUserExpensesOverview(userId: string) {
    // Find all trips user is part of
    const memberships = await this.prisma.tripMember.findMany({
      where: { userId },
      include: {
        trip: {
          include: {
            destination: true,
            expenses: {
              include: {
                splits: true,
                paidBy: true,
              },
            },
          },
        },
      },
      orderBy: { trip: { startDate: 'desc' } },
    });

    let totalLoggedCents = 0;
    let userPaidTotalCents = 0;
    let userShareTotalCents = 0;

    const tripsSummary = memberships.map((m) => {
      const trip = m.trip;
      let tripTotalCents = 0;
      let userTripPaidCents = 0;
      let userTripShareCents = 0;

      for (const exp of trip.expenses) {
        const expCents = this.toCents(Number(exp.amount));
        tripTotalCents += expCents;

        if (exp.paidById === userId) {
          userTripPaidCents += expCents;
        }

        for (const s of exp.splits) {
          if (s.userId === userId) {
            userTripShareCents += this.toCents(Number(s.amount));
          }
        }
      }

      totalLoggedCents += tripTotalCents;
      userPaidTotalCents += userTripPaidCents;
      userShareTotalCents += userTripShareCents;

      return {
        id: trip.id,
        title: trip.title,
        currency: trip.currency,
        destinationName: trip.destination.name,
        coverImage: trip.coverImage || trip.destination.coverImage,
        startDate: trip.startDate.toISOString(),
        endDate: trip.endDate.toISOString(),
        role: m.role,
        expenseCount: trip.expenses.length,
        totalExpenses: this.fromCents(tripTotalCents),
        userPaid: this.fromCents(userTripPaidCents),
        userShare: this.fromCents(userTripShareCents),
        netBalance: this.fromCents(userTripPaidCents - userTripShareCents),
      };
    });

    const netOwedCents = userPaidTotalCents - userShareTotalCents;

    return {
      totalLogged: this.fromCents(totalLoggedCents),
      youPaid: this.fromCents(userPaidTotalCents),
      yourShare: this.fromCents(userShareTotalCents),
      netBalance: this.fromCents(netOwedCents),
      trips: tripsSummary,
    };
  }
}
