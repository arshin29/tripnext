import { CookieOptions, Response } from 'express';
import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME } from '@tripnest/shared';

export function getAuthCookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}

export function setAuthCookie(res: Response, token: string, isProduction: boolean): void {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(isProduction));
}

export function clearAuthCookie(res: Response, isProduction: boolean): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
}
