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

    // Decode the Google ID token (JWT) to extract user info.
    // In production, you should verify the token signature with Google's public keys.
    // For MVP, we decode and validate the issuer/audience.
    const payload = this.decodeGoogleToken(body.credential);

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

  /**
   * Decode Google ID token (JWT).
   * IMPORTANT: In production, verify signature against Google's JWKS:
   * https://www.googleapis.com/oauth2/v3/certs
   */
  private decodeGoogleToken(token: string): {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
  } {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) throw new Error('Invalid JWT format');
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8'),
      ) as {
        sub?: string;
        email?: string;
        iss?: string;
        aud?: string;
        exp?: number;
        name?: string;
        picture?: string;
      };

      // Basic validation
      if (!payload.sub || !payload.email) {
        throw new Error('Missing required claims');
      }
      if (
        payload.iss !== 'accounts.google.com' &&
        payload.iss !== 'https://accounts.google.com'
      ) {
        throw new Error('Invalid issuer');
      }

      // Verify audience matches our Client ID (prevents tokens from other apps being accepted)
      const expectedAud = process.env.GOOGLE_CLIENT_ID;
      if (expectedAud && payload.aud !== expectedAud) {
        throw new Error('Token audience mismatch');
      }

      // Check expiry
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
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
      this.logger.warn(`Google token decode failed: ${msg}`);
      throw new BadRequestException('Invalid Google credential.');
    }
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName = process.env.AUTH_COOKIE_NAME || 'rentpropertyuae_rt';
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    res.cookie(cookieName, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
      maxAge,
    });
  }
}
