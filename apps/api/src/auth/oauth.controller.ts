import {
  Body,
  Controller,
  Post,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { UserRole } from '@prisma/client';

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  iss?: string;
  aud?: string;
  exp?: string;
  error_description?: string;
};

/**
 * OAuth controller — handles token-based social login (SPA-friendly).
 *
 * Frontend obtains an ID token from Google Identity Services (GSI),
 * sends it here, and receives JWT tokens in return.
 */
@Controller('auth/oauth')
export class OAuthController {
  private readonly logger = new Logger(OAuthController.name);

  constructor(private readonly auth: AuthService) {}

  /**
   * Google Sign-In: verify Google ID token and issue JWT.
   * Frontend uses Google Identity Services to get the credential (ID token),
   * then POSTs it here.
   */
  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async google(
    @Body() body: { credential: string; role?: UserRole },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.credential) {
      throw new BadRequestException('Google credential is required.');
    }

    const payload = await this.verifyGoogleToken(body.credential);

    if (!payload.email) {
      throw new BadRequestException('Google account has no email.');
    }

    const result = await this.auth.oauthLogin({
      provider: 'google',
      providerId: payload.sub,
      email: payload.email,
      fullName: payload.name,
      avatarUrl: payload.picture,
      role: body.role,
    });

    // Set refresh token cookie (same pattern as regular login)
    this.setRefreshCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
      isNewUser: result.isNewUser,
    };
  }

  private async verifyGoogleToken(token: string): Promise<{
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  }> {
    try {
      const expectedAud = (
        process.env.GOOGLE_CLIENT_ID ??
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ??
        ''
      ).trim();
      if (!expectedAud) throw new Error('GOOGLE_CLIENT_ID is not configured');

      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`,
      );
      if (!response.ok) throw new Error('Google token verification failed');

      const payload = (await response.json()) as GoogleTokenInfo;
      if (payload.error_description) throw new Error(payload.error_description);

      if (!payload.sub || !payload.email) {
        throw new Error('Missing required claims');
      }
      if (
        payload.iss !== 'accounts.google.com' &&
        payload.iss !== 'https://accounts.google.com'
      ) {
        throw new Error('Invalid issuer');
      }

      if (payload.aud !== expectedAud) {
        throw new Error('Token audience mismatch');
      }
      if (payload.email_verified !== 'true') {
        throw new Error('Google email is not verified');
      }

      const now = Math.floor(Date.now() / 1000);
      const exp = Number(payload.exp);
      if (!Number.isFinite(exp) || exp < now) {
        throw new Error('Token expired');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Google token verification failed: ${msg}`);
      throw new BadRequestException('Invalid Google credential.');
    }
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = process.env.AUTH_COOKIE_NAME || 'rentpropertyuae_rt';
    const envSecure = process.env.AUTH_COOKIE_SECURE;
    const envSameSite = process.env.AUTH_COOKIE_SAMESITE;
    const envDomain = process.env.AUTH_COOKIE_DOMAIN;
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    res.cookie(cookieName, refreshToken, {
      httpOnly: true,
      secure: envSecure !== undefined ? envSecure === 'true' : isProduction,
      sameSite: (envSameSite !== undefined
        ? envSameSite
        : isProduction
          ? 'none'
          : 'lax') as 'lax' | 'strict' | 'none',
      domain: envDomain || undefined,
      path: '/',
      maxAge,
    });
  }
}
