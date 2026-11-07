import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME, SafeUser } from '@tripnest/shared';
import { Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    updateProfile: jest.Mock;
  };
  let configService: {
    get: jest.Mock;
  };
  let jwtService: {
    verifyAsync: jest.Mock;
  };

  const mockSafeUser: SafeUser = {
    id: 'user-id-1234',
    name: 'Julian Hayes',
    email: 'julian@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const createMockResponse = (): Response => {
    const res: any = {};
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      updateProfile: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'nodeEnv') return 'development';
        return defaultValue;
      }),
    };

    jwtService = {
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('register', () => {
    it('should register a user, set HttpOnly cookie with security flags, and return safe user', async () => {
      authService.register.mockResolvedValue({
        user: mockSafeUser,
        token: 'signed-token-123',
      });
      const res = createMockResponse();

      const response = await controller.register(
        {
          name: 'Julian Hayes',
          email: 'julian@example.com',
          password: 'Password123!',
        },
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'signed-token-123', {
        httpOnly: true,
        secure: false, // in development
        sameSite: 'lax',
        path: '/',
        maxAge: AUTH_COOKIE_MAX_AGE_MS,
      });

      expect(response.success).toBe(true);
      expect(response.data?.user).toEqual(mockSafeUser);
      expect((response.data?.user as any).passwordHash).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should log in a user, set HttpOnly cookie, and return safe user', async () => {
      authService.login.mockResolvedValue({
        user: mockSafeUser,
        token: 'signed-token-login',
      });
      const res = createMockResponse();

      const response = await controller.login(
        {
          email: 'julian@example.com',
          password: 'Password123!',
        },
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'signed-token-login', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: AUTH_COOKIE_MAX_AGE_MS,
      });

      expect(response.success).toBe(true);
      expect(response.data?.user.id).toBe(mockSafeUser.id);
    });
  });

  describe('logout', () => {
    it('should clear the session cookie and return success', async () => {
      const res = createMockResponse();

      const response = await controller.logout(res);

      expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeNull();
    });
  });

  describe('getProfile', () => {
    it('should return the current user without password hash', () => {
      const response = controller.getProfile(mockSafeUser);

      expect(response.success).toBe(true);
      expect(response.data?.user).toEqual(mockSafeUser);
    });
  });

  describe('updateProfile', () => {
    it('should update and return the updated safe user', async () => {
      const updatedUser = { ...mockSafeUser, name: 'Julian Hayes Updated' };
      authService.updateProfile.mockResolvedValue(updatedUser);

      const response = await controller.updateProfile(mockSafeUser.id, {
        name: 'Julian Hayes Updated',
      });

      expect(authService.updateProfile).toHaveBeenCalledWith(mockSafeUser.id, {
        name: 'Julian Hayes Updated',
      });
      expect(response.success).toBe(true);
      expect(response.data?.user.name).toBe('Julian Hayes Updated');
    });
  });

  describe('production cookie security settings', () => {
    it('should set secure flag to true when nodeEnv is production', async () => {
      const prodConfigService = {
        get: jest.fn().mockImplementation((key: string) => {
          if (key === 'nodeEnv') return 'production';
          return undefined;
        }),
      };

      const prodModule: TestingModule = await Test.createTestingModule({
        controllers: [AuthController],
        providers: [
          { provide: AuthService, useValue: authService },
          { provide: ConfigService, useValue: prodConfigService },
          { provide: JwtService, useValue: jwtService },
        ],
      }).compile();

      const prodController = prodModule.get<AuthController>(AuthController);
      const res = createMockResponse();
      authService.login.mockResolvedValue({
        user: mockSafeUser,
        token: 'prod-token',
      });

      await prodController.login(
        { email: 'julian@example.com', password: 'Password123!' },
        res,
      );

      expect(res.cookie).toHaveBeenCalledWith(
        AUTH_COOKIE_NAME,
        'prod-token',
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        }),
      );
    });
  });
});
