import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME, CSRF_HEADER_NAME, SafeUser } from '@tripnest/shared';
import { Request } from 'express';
import { AuthService, JwtPayload } from '../auth.service';

export interface AuthenticatedRequest extends Request {
  user?: SafeUser;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // 1. Extract token from HTTP-only cookie or Authorization header
    let token: string | undefined;
    let fromCookie = false;

    if (request.cookies && request.cookies[AUTH_COOKIE_NAME]) {
      token = request.cookies[AUTH_COOKIE_NAME];
      fromCookie = true;
    } else if (
      request.headers.authorization &&
      request.headers.authorization.startsWith('Bearer ')
    ) {
      token = request.headers.authorization.slice(7).trim();
    }

    if (!token) {
      throw new UnauthorizedException(
        'Authentication required. Please sign in to access this resource.',
      );
    }

    // 2. CSRF check for state-changing requests authenticated via cookie
    const stateChangingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (fromCookie && stateChangingMethods.includes(request.method.toUpperCase())) {
      const csrfHeader =
        request.headers[CSRF_HEADER_NAME] || request.headers['x-requested-with'];
      if (!csrfHeader) {
        throw new ForbiddenException(
          'Security check failed: Missing CSRF protection header.',
        );
      }
    }

    // 3. Verify JWT signature and expiration
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.authService.validateUser(payload.sub);
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Your session has expired or is invalid. Please sign in again.',
      );
    }
  }
}
