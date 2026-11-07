import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { SafeUser } from '@tripnest/shared';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user account.
   */
  async register(dto: RegisterDto): Promise<{ user: SafeUser; token: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });

    const token = await this.generateToken(user);

    return {
      user: this.toSafeUser(user),
      token,
    };
  }

  /**
   * Authenticate a user with email and password.
   */
  async login(dto: LoginDto): Promise<{ user: SafeUser; token: string }> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const token = await this.generateToken(user);

    return {
      user: this.toSafeUser(user),
      token,
    };
  }

  /**
   * Validate and retrieve safe user by user ID.
   */
  async validateUser(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or session invalid.');
    }

    return this.toSafeUser(user);
  }

  /**
   * Update user profile information.
   */
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const dataToUpdate: {
      name?: string;
      email?: string;
      passwordHash?: string;
    } = {};

    if (dto.name && dto.name.trim() !== user.name) {
      dataToUpdate.name = dto.name.trim();
    }

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const emailInUse = await this.prisma.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (emailInUse && emailInUse.id !== userId) {
          throw new ConflictException(
            'This email address is already in use by another account.',
          );
        }
        dataToUpdate.email = normalizedEmail;
      }
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'Current password is required to set a new password.',
        );
      }

      const isCurrentPasswordValid = await bcrypt.compare(
        dto.currentPassword,
        user.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('The current password you provided is incorrect.');
      }

      dataToUpdate.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return this.toSafeUser(user);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });

    return this.toSafeUser(updatedUser);
  }

  /**
   * Generate signed JWT token.
   */
  private async generateToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };
    return this.jwtService.signAsync(payload);
  }

  /**
   * Transform database User model into SafeUser omitting sensitive fields.
   */
  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
