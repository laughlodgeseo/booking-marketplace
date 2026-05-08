import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type StrategyOptions } from 'passport-jwt';
import type { Request } from 'express';
import type { JwtRefreshPayload } from '../types/auth.types';
import { requiredJwtSecret } from '../../common/config/env.validation';

export type RefreshAuthUser = {
  id: string;
  refreshToken: string;
};

function cookieName(): string {
  return process.env.AUTH_COOKIE_NAME || 'rentpropertyuae_rt';
}

function extractRefreshTokenFromCookie(req: Request): string | null {
  const cookies =
    (req as unknown as { cookies?: Record<string, string> }).cookies ?? {};
  const cookieToken = cookies[cookieName()];
  if (typeof cookieToken === 'string' && cookieToken.trim())
    return cookieToken.trim();

  return null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor() {
    const options: StrategyOptions = {
      jwtFromRequest: (req: Request) => extractRefreshTokenFromCookie(req),
      secretOrKey: requiredJwtSecret('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    };
    super(options);
  }

  validate(req: Request, payload: JwtRefreshPayload): RefreshAuthUser {
    const refreshToken = extractRefreshTokenFromCookie(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token cookie is missing.');
    }

    return { id: payload.sub, refreshToken };
  }
}
