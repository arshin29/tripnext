import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: {
    signAsync: jest.Mock;
  };

  const mockDate = new Date('2026-01-01T00:00:00.000Z');
  const mockUser = {
    id: 'user-uuid-1234',
    name: 'Eleanor Vance',
    email: 'eleanor@example.com',
    passwordHash: '$2a$10$fakehashedpasswordhashvalue1234567890',
    createdAt: mockDate,
    updatedAt: mockDate,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-signed-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully and return safe user with token', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        name: 'Eleanor Vance',
        email: '  Eleanor@Example.COM  ',
        password: 'Password123!',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'eleanor@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Eleanor Vance',
          email: 'eleanor@example.com',
          passwordHash: expect.any(String),
        },
      });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });

      expect(result.token).toBe('mock-signed-jwt-token');
      expect(result.user).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        createdAt: mockDate.toISOString(),
        updatedAt: mockDate.toISOString(),
      });
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should throw ConflictException if email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          name: 'Another User',
          email: 'eleanor@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials and return safe user with token', async () => {
      const plainPassword = 'ValidPassword123!';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(plainPassword, salt);
      const userWithRealHash = { ...mockUser, passwordHash: hash };

      prisma.user.findUnique.mockResolvedValue(userWithRealHash);

      const result = await service.login({
        email: '  ELEANOR@example.com ',
        password: plainPassword,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'eleanor@example.com' },
      });
      expect(result.token).toBe('mock-signed-jwt-token');
      expect(result.user.id).toBe(mockUser.id);
      expect((result.user as any).passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('CorrectPassword123!', salt);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(
        service.login({
          email: 'eleanor@example.com',
          password: 'WrongPassword999!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return safe user if user exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const user = await service.validateUser(mockUser.id);
      expect(user.id).toBe(mockUser.id);
      expect(user.email).toBe(mockUser.email);
      expect((user as any).passwordHash).toBeUndefined();
    });

    it('should throw UnauthorizedException if user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.validateUser('nonexistent-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update name successfully', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        name: 'Eleanor Updated',
      });

      const result = await service.updateProfile(mockUser.id, {
        name: 'Eleanor Updated',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { name: 'Eleanor Updated' },
      });
      expect(result.name).toBe('Eleanor Updated');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should update email if not taken', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // find current user
        .mockResolvedValueOnce(null); // find user by new email
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        email: 'newemail@example.com',
      });

      const result = await service.updateProfile(mockUser.id, {
        email: 'newemail@example.com',
      });

      expect(result.email).toBe('newemail@example.com');
    });

    it('should throw ConflictException if new email is already taken by another user', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce({ ...mockUser, id: 'different-user-id' });

      await expect(
        service.updateProfile(mockUser.id, {
          email: 'taken@example.com',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should update password when correct current password is provided', async () => {
      const currentPassword = 'OldPassword123!';
      const hash = await bcrypt.hash(currentPassword, 10);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
      });
      prisma.user.update.mockResolvedValue(mockUser);

      await service.updateProfile(mockUser.id, {
        currentPassword,
        newPassword: 'BrandNewPassword456!',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          passwordHash: expect.any(String),
        },
      });
    });

    it('should throw BadRequestException if current password is wrong', async () => {
      const hash = await bcrypt.hash('ActualPassword123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: hash,
      });

      await expect(
        service.updateProfile(mockUser.id, {
          currentPassword: 'WrongCurrentPassword!',
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if newPassword is provided without currentPassword', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.updateProfile(mockUser.id, {
          newPassword: 'NewPassword123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
