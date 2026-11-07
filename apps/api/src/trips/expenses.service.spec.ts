import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationService } from './collaboration.service';
import { ExpensesService } from './expenses.service';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: any;
  let collaborationService: any;

  const mockDate = new Date();

  const mockTrip = {
    id: 'trip-1',
    currency: 'INR',
  };

  const mockUser1 = {
    id: 'user-1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockUser2 = {
    id: 'user-2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockUser3 = {
    id: 'user-3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  const mockMembers = [
    { id: 'm-1', tripId: 'trip-1', userId: 'user-1', role: 'OWNER', user: mockUser1 },
    { id: 'm-2', tripId: 'trip-1', userId: 'user-2', role: 'MEMBER', user: mockUser2 },
    { id: 'm-3', tripId: 'trip-1', userId: 'user-3', role: 'MEMBER', user: mockUser3 },
  ];

  beforeEach(async () => {
    prisma = {
      tripMember: {
        findMany: jest.fn().mockResolvedValue(mockMembers),
      },
      expense: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      expenseSplit: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    collaborationService = {
      validateTripAccess: jest.fn().mockResolvedValue({ trip: mockTrip, role: 'MEMBER' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CollaborationService, useValue: collaborationService },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
  });

  describe('calculateEqualSplits', () => {
    it('should split 100 equally across 3 members with exact rounding so sum is 100.00', () => {
      const splits = service.calculateEqualSplits(100.0, ['user-1', 'user-2', 'user-3']);
      expect(splits).toEqual([
        { userId: 'user-1', amount: 33.34 },
        { userId: 'user-2', amount: 33.33 },
        { userId: 'user-3', amount: 33.33 },
      ]);
      const total = splits.reduce((acc, s) => acc + s.amount, 0);
      expect(Number(total.toFixed(2))).toBe(100.0);
    });

    it('should split cleanly when divisible', () => {
      const splits = service.calculateEqualSplits(60.0, ['user-1', 'user-2', 'user-3']);
      expect(splits).toEqual([
        { userId: 'user-1', amount: 20.0 },
        { userId: 'user-2', amount: 20.0 },
        { userId: 'user-3', amount: 20.0 },
      ]);
      const total = splits.reduce((acc, s) => acc + s.amount, 0);
      expect(Number(total.toFixed(2))).toBe(60.0);
    });
  });

  describe('validateCustomSplits', () => {
    it('should accept valid custom splits that match total amount', () => {
      const splits = service.validateCustomSplits(150.0, [
        { userId: 'user-1', amount: 50.0 },
        { userId: 'user-2', amount: 75.0 },
        { userId: 'user-3', amount: 25.0 },
      ]);
      expect(splits).toHaveLength(3);
    });

    it('should reject custom splits when sum does not match total', () => {
      expect(() =>
        service.validateCustomSplits(150.0, [
          { userId: 'user-1', amount: 50.0 },
          { userId: 'user-2', amount: 75.0 },
          { userId: 'user-3', amount: 20.0 }, // sum = 145
        ]),
      ).toThrow(BadRequestException);
    });

    it('should reject negative split amounts', () => {
      expect(() =>
        service.validateCustomSplits(100.0, [
          { userId: 'user-1', amount: 150.0 },
          { userId: 'user-2', amount: -50.0 },
        ]),
      ).toThrow(BadRequestException);
    });
  });

  describe('createExpense', () => {
    it('should create an equal split expense', async () => {
      prisma.expense.create.mockResolvedValue({
        id: 'exp-1',
        tripId: 'trip-1',
        paidById: 'user-1',
        title: 'Villa Stay',
        category: 'Accommodation',
        amount: new Prisma.Decimal(120),
        currency: 'INR',
        expenseDate: mockDate,
        splitMethod: 'EQUAL',
        createdAt: mockDate,
        updatedAt: mockDate,
        paidBy: mockUser1,
        splits: [
          {
            id: 's-1',
            userId: 'user-1',
            amount: new Prisma.Decimal(40),
            user: mockUser1,
          },
          {
            id: 's-2',
            userId: 'user-2',
            amount: new Prisma.Decimal(40),
            user: mockUser2,
          },
          {
            id: 's-3',
            userId: 'user-3',
            amount: new Prisma.Decimal(40),
            user: mockUser3,
          },
        ],
      });

      const result = await service.createExpense('user-1', 'trip-1', {
        title: 'Villa Stay',
        category: 'Accommodation',
        amount: 120,
        paidById: 'user-1',
        expenseDate: mockDate.toISOString(),
        splitMethod: 'EQUAL',
        splits: [{ userId: 'user-1' }, { userId: 'user-2' }, { userId: 'user-3' }],
      });

      expect(result.id).toBe('exp-1');
      expect(result.amount).toBe(120);
      expect(result.splits).toHaveLength(3);
    });

    it('should reject expense if currency does not match trip currency', async () => {
      await expect(
        service.createExpense('user-1', 'trip-1', {
          title: 'Lunch',
          category: 'Food & Drinks',
          amount: 50,
          currency: 'USD', // trip is INR
          paidById: 'user-1',
          expenseDate: mockDate.toISOString(),
          splitMethod: 'EQUAL',
          splits: [{ userId: 'user-1' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject expense if payer or participant is not a trip member', async () => {
      await expect(
        service.createExpense('user-1', 'trip-1', {
          title: 'Dinner',
          category: 'Food & Drinks',
          amount: 50,
          paidById: 'user-unknown',
          expenseDate: mockDate.toISOString(),
          splitMethod: 'EQUAL',
          splits: [{ userId: 'user-1' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('permissions on deleteExpense', () => {
    it('should allow expense creator to delete their own expense', async () => {
      prisma.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        tripId: 'trip-1',
        paidById: 'user-2',
      });
      prisma.expense.delete.mockResolvedValue({});

      collaborationService.validateTripAccess.mockResolvedValue({
        trip: mockTrip,
        role: 'MEMBER',
      });

      const result = await service.deleteExpense('user-2', 'trip-1', 'exp-1');
      expect(result.success).toBe(true);
    });

    it('should allow trip owner to delete any expense', async () => {
      prisma.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        tripId: 'trip-1',
        paidById: 'user-2',
      });
      prisma.expense.delete.mockResolvedValue({});

      collaborationService.validateTripAccess.mockResolvedValue({
        trip: mockTrip,
        role: 'OWNER',
      });

      const result = await service.deleteExpense('user-1', 'trip-1', 'exp-1');
      expect(result.success).toBe(true);
    });

    it('should forbid other members from deleting someone else’s expense', async () => {
      prisma.expense.findFirst.mockResolvedValue({
        id: 'exp-1',
        tripId: 'trip-1',
        paidById: 'user-2',
      });

      collaborationService.validateTripAccess.mockResolvedValue({
        trip: mockTrip,
        role: 'MEMBER',
      });

      await expect(service.deleteExpense('user-3', 'trip-1', 'exp-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('group balances and settlements', () => {
    it('should calculate accurate member balances and simplified settlements', async () => {
      // User 1 paid 300 for Villa: split equally among user 1, 2, 3 (100 each)
      // Net: User 1: paid 300, owed 100 -> +200
      // User 2: paid 0, owed 100 -> -100
      // User 3: paid 0, owed 100 -> -100
      prisma.expense.findMany.mockResolvedValue([
        {
          id: 'exp-1',
          tripId: 'trip-1',
          paidById: 'user-1',
          category: 'Accommodation',
          amount: new Prisma.Decimal(300),
          splits: [
            { userId: 'user-1', amount: new Prisma.Decimal(100) },
            { userId: 'user-2', amount: new Prisma.Decimal(100) },
            { userId: 'user-3', amount: new Prisma.Decimal(100) },
          ],
        },
      ]);

      const summary = await service.getGroupBalances('user-1', 'trip-1');
      expect(summary.totalTripExpenses).toBe(300);
      expect(summary.currentUserPaid).toBe(300);
      expect(summary.currentUserShare).toBe(100);
      expect(summary.currentUserNetBalance).toBe(200);

      const u1 = summary.members.find((m) => m.userId === 'user-1')!;
      const u2 = summary.members.find((m) => m.userId === 'user-2')!;
      const u3 = summary.members.find((m) => m.userId === 'user-3')!;

      expect(u1.netBalance).toBe(200);
      expect(u2.netBalance).toBe(-100);
      expect(u3.netBalance).toBe(-100);

      // Settlements: User 2 pays User 1 100, User 3 pays User 1 100
      expect(summary.settlements).toHaveLength(2);
      expect(summary.settlements).toContainEqual({
        fromUserId: 'user-2',
        fromUserName: 'Bob Smith',
        toUserId: 'user-1',
        toUserName: 'Alice Johnson',
        amount: 100,
        currency: 'INR',
      });
      expect(summary.settlements).toContainEqual({
        fromUserId: 'user-3',
        fromUserName: 'Charlie Brown',
        toUserId: 'user-1',
        toUserName: 'Alice Johnson',
        amount: 100,
        currency: 'INR',
      });
    });

    it('should handle zero-balance case with no settlements', () => {
      const balances = [
        {
          userId: 'user-1',
          userName: 'Alice',
          userEmail: 'alice@example.com',
          totalPaid: 50,
          totalOwed: 50,
          netBalance: 0,
        },
        {
          userId: 'user-2',
          userName: 'Bob',
          userEmail: 'bob@example.com',
          totalPaid: 50,
          totalOwed: 50,
          netBalance: 0,
        },
      ];

      const settlements = service.computeSettlementSuggestions(balances, 'INR');
      expect(settlements).toHaveLength(0);
    });
  });
});
