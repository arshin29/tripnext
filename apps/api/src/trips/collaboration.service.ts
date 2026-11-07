import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  InvitationDetails,
  SafeUser,
  TripInvitation,
  TripMember,
  TripMemberRole,
} from '@tripnest/shared';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInvitationDto } from './dto';

@Injectable()
export class CollaborationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to format a safe user object.
   */
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
   * Validate that the user is the OWNER of the trip.
   */
  async validateTripOwner(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID '${tripId}' was not found.`);
    }

    const isDirectOwner = trip.userId === userId;
    const isMemberOwner = trip.members.some(
      (m) => m.userId === userId && m.role === 'OWNER',
    );

    if (!isDirectOwner && !isMemberOwner) {
      throw new ForbiddenException('Only the trip owner can perform this action.');
    }

    return trip;
  }

  /**
   * Validate that the user is either OWNER or MEMBER of the trip.
   */
  async validateTripAccess(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID '${tripId}' was not found.`);
    }

    const memberRecord = trip.members.find((m) => m.userId === userId);
    const isDirectOwner = trip.userId === userId;

    if (!memberRecord && !isDirectOwner) {
      throw new ForbiddenException('You do not have permission to access this trip.');
    }

    const role: TripMemberRole =
      isDirectOwner || memberRecord?.role === 'OWNER' ? 'OWNER' : 'MEMBER';
    return { trip, role, memberRecord };
  }

  /**
   * List all members of a trip.
   */
  async getTripMembers(userId: string, tripId: string): Promise<TripMember[]> {
    await this.validateTripAccess(userId, tripId);

    const members = await this.prisma.tripMember.findMany({
      where: { tripId },
      include: {
        user: true,
      },
      orderBy: [
        { role: 'asc' }, // OWNER first
        { joinedAt: 'asc' },
      ],
    });

    return members.map((m) => ({
      id: m.id,
      tripId: m.tripId,
      userId: m.userId,
      role: m.role as TripMemberRole,
      joinedAt: m.joinedAt.toISOString(),
      user: this.toSafeUser(m.user),
    }));
  }

  /**
   * Remove a member from a trip (Owner only).
   */
  async removeMember(
    userId: string,
    tripId: string,
    memberId: string,
  ): Promise<{ success: boolean; memberId: string }> {
    const trip = await this.validateTripOwner(userId, tripId);

    const targetMember = await this.prisma.tripMember.findFirst({
      where: { id: memberId, tripId },
      include: { user: true },
    });

    if (!targetMember) {
      throw new NotFoundException(
        `Member record with ID '${memberId}' not found on this trip.`,
      );
    }

    if (targetMember.role === 'OWNER' || targetMember.userId === trip.userId) {
      throw new BadRequestException('Cannot remove the trip owner from the trip.');
    }

    await this.prisma.tripMember.delete({
      where: { id: memberId },
    });

    return { success: true, memberId };
  }

  /**
   * Create a secure invitation link (Owner only).
   */
  async createInvitation(
    userId: string,
    tripId: string,
    dto: CreateInvitationDto,
  ): Promise<TripInvitation> {
    await this.validateTripOwner(userId, tripId);

    const email = dto.email.trim().toLowerCase();

    // Check if inviter is inviting their own email
    const inviter = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (inviter.email.toLowerCase() === email) {
      throw new BadRequestException('You cannot invite yourself to your own trip.');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.tripMember.findFirst({
      where: {
        tripId,
        user: {
          email: { equals: email, mode: 'insensitive' },
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('This user is already a member of this trip.');
    }

    // Check for existing pending & unexpired invitation
    const existingActiveInvitation = await this.prisma.tripInvitation.findFirst({
      where: {
        tripId,
        email: { equals: email, mode: 'insensitive' },
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingActiveInvitation) {
      throw new ConflictException(
        'An active pending invitation has already been sent to this email address.',
      );
    }

    // Generate random 32-byte hex token and store SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 7 days expiration
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const created = await this.prisma.tripInvitation.create({
      data: {
        tripId,
        inviterId: userId,
        email,
        tokenHash,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        inviter: true,
      },
    });

    return {
      id: created.id,
      tripId: created.tripId,
      inviterId: created.inviterId,
      email: created.email,
      status: created.status as any,
      expiresAt: created.expiresAt.toISOString(),
      createdAt: created.createdAt.toISOString(),
      inviter: this.toSafeUser(created.inviter),
      invitationUrl: `/invite/${rawToken}`,
    };
  }

  /**
   * Get all pending invitations for a trip (Owner only).
   */
  async getTripInvitations(userId: string, tripId: string): Promise<TripInvitation[]> {
    await this.validateTripOwner(userId, tripId);

    // Auto-expire outdated pending invitations
    await this.prisma.tripInvitation.updateMany({
      where: {
        tripId,
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const invitations = await this.prisma.tripInvitation.findMany({
      where: {
        tripId,
        status: 'PENDING',
      },
      include: {
        inviter: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      tripId: inv.tripId,
      inviterId: inv.inviterId,
      email: inv.email,
      status: inv.status as any,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      inviter: this.toSafeUser(inv.inviter),
    }));
  }

  /**
   * Revoke a pending invitation (Owner only).
   */
  async revokeInvitation(
    userId: string,
    tripId: string,
    invitationId: string,
  ): Promise<{ success: boolean; invitationId: string }> {
    await this.validateTripOwner(userId, tripId);

    const invitation = await this.prisma.tripInvitation.findFirst({
      where: { id: invitationId, tripId },
    });

    if (!invitation) {
      throw new NotFoundException(
        `Invitation with ID '${invitationId}' was not found on this trip.`,
      );
    }

    await this.prisma.tripInvitation.delete({
      where: { id: invitationId },
    });

    return { success: true, invitationId };
  }

  /**
   * Inspect an invitation by raw token (Public/Authenticated).
   */
  async getInvitationByToken(rawToken: string): Promise<InvitationDetails> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new BadRequestException('Invalid invitation token.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invitation = await this.prisma.tripInvitation.findFirst({
      where: { tokenHash },
      include: {
        inviter: true,
        trip: {
          include: {
            destination: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid.');
    }

    // Check expiry
    let status = invitation.status as any;
    if (status === 'PENDING' && invitation.expiresAt < new Date()) {
      status = 'EXPIRED';
      await this.prisma.tripInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
    }

    return {
      id: invitation.id,
      tripId: invitation.tripId,
      inviterId: invitation.inviterId,
      email: invitation.email,
      status,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      inviterName: invitation.inviter.name,
      inviterEmail: invitation.inviter.email,
      tripTitle: invitation.trip.title,
      destinationName: invitation.trip.destination.name,
      destinationCoverImage:
        invitation.trip.coverImage || invitation.trip.destination.coverImage,
      startDate: invitation.trip.startDate.toISOString(),
      endDate: invitation.trip.endDate.toISOString(),
    };
  }

  /**
   * Accept an invitation (Authenticated).
   * Verifies that the authenticated user's email matches the invited email.
   */
  async acceptInvitation(
    userId: string,
    rawToken: string,
  ): Promise<{ success: boolean; tripId: string; message: string }> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new BadRequestException('Invalid invitation token.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invitation = await this.prisma.tripInvitation.findFirst({
      where: { tokenHash },
      include: { trip: true },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid.');
    }

    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        `This invitation has already been ${invitation.status.toLowerCase()}.`,
      );
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.tripInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('This invitation has expired.');
    }

    // Verify authenticated user's email
    const currentUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        `This invitation was sent to ${invitation.email}. You are currently signed in as ${currentUser.email}. Please sign in with the invited email to accept.`,
      );
    }

    // Accept transaction
    await this.prisma.$transaction(async (tx) => {
      // Check if already a member
      const existingMember = await tx.tripMember.findUnique({
        where: {
          tripId_userId: {
            tripId: invitation.tripId,
            userId,
          },
        },
      });

      if (!existingMember) {
        await tx.tripMember.create({
          data: {
            tripId: invitation.tripId,
            userId,
            role: 'MEMBER',
          },
        });
      }

      await tx.tripInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' },
      });
    });

    return {
      success: true,
      tripId: invitation.tripId,
      message: 'Invitation accepted! You are now a member of this trip.',
    };
  }

  /**
   * Decline an invitation (Authenticated).
   */
  async declineInvitation(
    userId: string,
    rawToken: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new BadRequestException('Invalid invitation token.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const invitation = await this.prisma.tripInvitation.findFirst({
      where: { tokenHash },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid.');
    }

    const currentUser = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (currentUser.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenException(
        'You do not have permission to decline this invitation as it was sent to a different email address.',
      );
    }

    await this.prisma.tripInvitation.update({
      where: { id: invitation.id },
      data: { status: 'DECLINED' },
    });

    return {
      success: true,
      message: 'Invitation declined.',
    };
  }
}
