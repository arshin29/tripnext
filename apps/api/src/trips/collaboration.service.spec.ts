import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationService } from './collaboration.service';

describe('CollaborationService', () => {
  let service: CollaborationService;
  let prisma: any;

  const mockDate = new Date();
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

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

  const mockTrip = {
    id: 'trip-1',
    userId: 'user-1',
    title: 'Kyoto Retreat',
    currency: 'INR',
    startDate: mockDate,
    endDate: futureDate,
    members: [
      {
        id: 'member-1',
        tripId: 'trip-1',
        userId: 'user-1',
        role: 'OWNER',
        joinedAt: mockDate,
        user: mockUser1,
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      trip: {
        findUnique: jest.fn(),
      },
      tripMember: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
      tripInvitation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUniqueOrThrow: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [CollaborationService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CollaborationService>(CollaborationService);
  });

  describe('createInvitation', () => {
    it('should allow owner to create an invitation and return invitationUrl with unhashed token', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser1);
      prisma.tripMember.findFirst.mockResolvedValue(null);
      prisma.tripInvitation.findFirst.mockResolvedValue(null);
      prisma.tripInvitation.create.mockImplementation((args: any) => ({
        id: 'inv-1',
        tripId: 'trip-1',
        inviterId: 'user-1',
        email: 'bob@example.com',
        tokenHash: args.data.tokenHash,
        status: 'PENDING',
        expiresAt: args.data.expiresAt,
        createdAt: mockDate,
        inviter: mockUser1,
      }));

      const result = await service.createInvitation('user-1', 'trip-1', {
        email: 'bob@example.com',
      });

      expect(result.id).toBe('inv-1');
      expect(result.email).toBe('bob@example.com');
      expect(result.status).toBe('PENDING');
      expect(result.invitationUrl).toMatch(/^\/invite\/[a-f0-9]{64}$/);
      expect((result as any).tokenHash).toBeUndefined();
    });

    it('should reject invitation if inviter invites their own email', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser1);

      await expect(
        service.createInvitation('user-1', 'trip-1', { email: 'alice@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invitation if invitee is already a member', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser1);
      prisma.tripMember.findFirst.mockResolvedValue({ id: 'm-2', userId: 'user-2' });

      await expect(
        service.createInvitation('user-1', 'trip-1', { email: 'bob@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject invitation if an active pending invitation already exists', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser1);
      prisma.tripMember.findFirst.mockResolvedValue(null);
      prisma.tripInvitation.findFirst.mockResolvedValue({
        id: 'inv-old',
        status: 'PENDING',
      });

      await expect(
        service.createInvitation('user-1', 'trip-1', { email: 'bob@example.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject non-owners from creating invitations', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);

      await expect(
        service.createInvitation('user-2', 'trip-1', { email: 'charlie@example.com' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('acceptInvitation', () => {
    const rawToken = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    it('should successfully accept an invitation when user email matches', async () => {
      prisma.tripInvitation.findFirst.mockResolvedValue({
        id: 'inv-1',
        tripId: 'trip-1',
        email: 'bob@example.com',
        tokenHash,
        status: 'PENDING',
        expiresAt: futureDate,
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser2);
      prisma.tripMember.findUnique.mockResolvedValue(null);
      prisma.tripMember.create.mockResolvedValue({ id: 'm-new' });
      prisma.tripInvitation.update.mockResolvedValue({ id: 'inv-1', status: 'ACCEPTED' });

      const result = await service.acceptInvitation('user-2', rawToken);
      expect(result.success).toBe(true);
      expect(result.tripId).toBe('trip-1');
      expect(prisma.tripMember.create).toHaveBeenCalledWith({
        data: {
          tripId: 'trip-1',
          userId: 'user-2',
          role: 'MEMBER',
        },
      });
    });

    it('should reject acceptance if user email does not match invited email', async () => {
      prisma.tripInvitation.findFirst.mockResolvedValue({
        id: 'inv-1',
        tripId: 'trip-1',
        email: 'charlie@example.com',
        tokenHash,
        status: 'PENDING',
        expiresAt: futureDate,
      });
      prisma.user.findUniqueOrThrow.mockResolvedValue(mockUser2); // bob@example.com

      await expect(service.acceptInvitation('user-2', rawToken)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject acceptance if invitation has expired', async () => {
      prisma.tripInvitation.findFirst.mockResolvedValue({
        id: 'inv-1',
        tripId: 'trip-1',
        email: 'bob@example.com',
        tokenHash,
        status: 'PENDING',
        expiresAt: pastDate,
      });

      await expect(service.acceptInvitation('user-2', rawToken)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeMember', () => {
    it('should allow owner to remove a regular member', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);
      prisma.tripMember.findFirst.mockResolvedValue({
        id: 'member-2',
        tripId: 'trip-1',
        userId: 'user-2',
        role: 'MEMBER',
      });
      prisma.tripMember.delete.mockResolvedValue({ id: 'member-2' });

      const result = await service.removeMember('user-1', 'trip-1', 'member-2');
      expect(result.success).toBe(true);
      expect(prisma.tripMember.delete).toHaveBeenCalledWith({
        where: { id: 'member-2' },
      });
    });

    it('should reject removing the trip owner', async () => {
      prisma.trip.findUnique.mockResolvedValue(mockTrip);
      prisma.tripMember.findFirst.mockResolvedValue({
        id: 'member-1',
        tripId: 'trip-1',
        userId: 'user-1',
        role: 'OWNER',
      });

      await expect(service.removeMember('user-1', 'trip-1', 'member-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
