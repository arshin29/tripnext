import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { AUTH_COOKIE_NAME, CSRF_HEADER_NAME, SafeUser } from '@tripnest/shared';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: {
    verifyAsync: jest.Mock;
  };
  let authService: {
    validateUser: jest.Mock;
  };

  const mockUser: SafeUser = {
    id: 'user-id-999',
    name: 'Aria Montgomery',
    email: 'aria@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const createMockContext = (req: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn(),
    };
    authService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should throw UnauthorizedException if no token is provided', async () => {
    const ctx = createMockContext({
      cookies: {},
      headers: {},
      method: 'GET',
    });

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow GET request with valid cookie and set request.user', async () => {
    const req: any = {
      cookies: { [AUTH_COOKIE_NAME]: 'valid-session-jwt' },
      headers: {},
      method: 'GET',
    };
    const ctx = createMockContext(req);

    jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, email: mockUser.email });
    authService.validateUser.mockResolvedValue(mockUser);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.user).toEqual(mockUser);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-session-jwt');
  });

  it('should throw ForbiddenException for cookie-authenticated POST request without CSRF header', async () => {
    const req: any = {
      cookies: { [AUTH_COOKIE_NAME]: 'valid-session-jwt' },
      headers: {},
      method: 'POST',
    };
    const ctx = createMockContext(req);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should allow cookie-authenticated PATCH request with CSRF header present', async () => {
    const req: any = {
      cookies: { [AUTH_COOKIE_NAME]: 'valid-session-jwt' },
      headers: { [CSRF_HEADER_NAME]: '1' },
      method: 'PATCH',
    };
    const ctx = createMockContext(req);

    jwtService.verifyAsync.mockResolvedValue({ sub: mockUser.id, email: mockUser.email });
    authService.validateUser.mockResolvedValue(mockUser);

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.user).toEqual(mockUser);
  });

  it('should throw UnauthorizedException if token is expired or invalid', async () => {
    const req: any = {
      cookies: { [AUTH_COOKIE_NAME]: 'expired-token' },
      headers: {},
      method: 'GET',
    };
    const ctx = createMockContext(req);

    jwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
