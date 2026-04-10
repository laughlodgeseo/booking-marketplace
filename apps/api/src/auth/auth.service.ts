import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../modules/prisma/prisma.service';
import { hashPassword, verifyPassword } from '../common/security/password';
import { hashToken, verifyToken } from '../common/security/token-hash';
import { JwtAccessPayload, JwtRefreshPayload } from './types/auth.types';
import { parseDurationToSeconds } from '../common/security/duration';

type SafeAuthUser = {
  id: string;
  email: string;
  role: UserRole;
  isEmailVerified: boolean;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private splitName(fullName?: string | null): {
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
  } {
    const normalized = fullName?.trim() || null;
    if (!normalized) {
      return { fullName: null, firstName: null, lastName: null };
    }

    const parts = normalized.split(/\s+/g).filter(Boolean);
    if (parts.length === 0) {
      return { fullName: null, firstName: null, lastName: null };
    }

    if (parts.length === 1) {
      return {
        fullName: normalized,
        firstName: parts[0] ?? null,
        lastName: null,
      };
    }

    const firstName = parts[0] ?? null;
    const lastName = parts.slice(1).join(' ').trim() || null;
    return { fullName: normalized, firstName, lastName };
  }

  private accessExpiresSeconds(): number {
    const raw = process.env.JWT_ACCESS_EXPIRES_IN || '40m';
    return parseDurationToSeconds(raw, 40 * 60);
  }

  private refreshExpiresDays(): number {
    const v = Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '30');
    return Number.isFinite(v) ? v : 30;
  }

  private refreshExpiryDate(): Date {
    const days = this.refreshExpiresDays();
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  /**
   * Canonical "me" endpoint source of truth.
   * SECURITY: Only returns safe fields (no tokens, no passwordHash, no OTP metadata).
   */
  async me(userId: string): Promise<{ user: SafeAuthUser }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        fullName: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return { user: { ...user, ...this.splitName(user.fullName) } };
  }

  async register(
    emailRaw: string,
    password: string,
    fullName?: string,
    role?: UserRole,
  ): Promise<{
    user: {
      id: string;
      email: string;
      role: UserRole;
      isEmailVerified: boolean;
      fullName: string | null;
      firstName: string | null;
      lastName: string | null;
    };
  }> {
    const email = emailRaw.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await hashPassword(password);

    const requestedRole = role ?? UserRole.CUSTOMER;
    if (
      requestedRole !== UserRole.CUSTOMER &&
      requestedRole !== UserRole.VENDOR
    ) {
      throw new BadRequestException('Invalid role for self-registration');
    }

    const normalizedFullName = fullName?.trim() || null;

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: normalizedFullName,
        role: requestedRole,
        isEmailVerified: false,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isEmailVerified: true,
        fullName: true,
      },
    });

    if (requestedRole === UserRole.VENDOR) {
      const emailLocal = email.split('@')[0]?.trim() || 'Vendor';
      const displayName = normalizedFullName || emailLocal;

      await this.prisma.vendorProfile.create({
        data: {
          userId: user.id,
          displayName,
          status: 'PENDING',
        },
      });
    }

    return { user: { ...user, ...this.splitName(user.fullName) } };
  }

  async login(
    emailRaw: string,
    password: string,
  ): Promise<{
    user: SafeAuthUser;
    accessToken: string;
    refreshToken: string;
  }> {
    const email = emailRaw.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    let ok = await verifyPassword(password, user.passwordHash);

    // Common UX issue: users copy/paste a password with accidental whitespace.
    if (!ok) {
      const trimmedPassword = password.trim();
      if (trimmedPassword !== password) {
        ok = await verifyPassword(trimmedPassword, user.passwordHash);
      }
    }

    if (!ok) {
      if (user.authProvider) {
        throw new UnauthorizedException(
          `Invalid credentials. This account is linked to ${user.authProvider} sign-in.`,
        );
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.signAccessToken(
      user.id,
      user.email,
      user.role,
    );
    const { refreshToken } = await this.issueRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        ...this.splitName(user.fullName),
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Legacy magic-link verification was removed.
   * Use OTP endpoints instead:
   * - POST /api/auth/email-verification/request
   * - POST /api/auth/email-verification/verify
   */
  verifyEmail(): never {
    throw new BadRequestException(
      'Legacy verify-email endpoint disabled. Use OTP verification endpoints.',
    );
  }

  async requestPasswordReset(emailRaw: string) {
    const email = emailRaw.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { ok: true };

    const tokenPlain = cryptoRandomToken(32);
    const tokenHashed = await hashToken(tokenPlain);

    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 30);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHashed,
        expiresAt: expires,
      },
    });

    return { ok: true, resetToken: tokenPlain };
  }

  async resetPassword(token: string, newPassword: string) {
    const candidates = await this.prisma.passwordResetToken.findMany({
      where: { usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    for (const c of candidates) {
      const match = await verifyToken(token, c.tokenHash);
      if (!match) continue;

      const newHash = await hashPassword(newPassword);

      await this.prisma.$transaction([
        this.prisma.passwordResetToken.update({
          where: { id: c.id },
          data: { usedAt: new Date() },
        }),
        this.prisma.user.update({
          where: { id: c.userId },
          data: { passwordHash: newHash },
        }),
        this.prisma.refreshToken.updateMany({
          where: { userId: c.userId, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);

      return { ok: true };
    }

    throw new BadRequestException('Invalid or expired token');
  }

  async refresh(
    userId: string,
    refreshTokenPlain: string,
  ): Promise<{
    user: SafeAuthUser;
    accessToken: string;
    refreshToken: string;
  }> {
    const active = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    let matchedId: string | null = null;
    for (const rt of active) {
      const ok = await verifyToken(refreshTokenPlain, rt.tokenHash);
      if (ok) {
        matchedId = rt.id;
        break;
      }
    }
    if (!matchedId) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const newAccess = await this.signAccessToken(
      user.id,
      user.email,
      user.role,
    );
    const { refreshToken: newRefresh, recordId: newRecordId } =
      await this.issueRefreshToken(user.id);

    await this.prisma.refreshToken.update({
      where: { id: matchedId },
      data: { revokedAt: new Date(), replacedById: newRecordId },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        ...this.splitName(user.fullName),
      },
      accessToken: newAccess,
      refreshToken: newRefresh,
    };
  }

  async logout(userId: string, refreshTokenPlain?: string) {
    if (!refreshTokenPlain) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    }

    const active = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    for (const rt of active) {
      const ok = await verifyToken(refreshTokenPlain, rt.tokenHash);
      if (!ok) continue;

      await this.prisma.refreshToken.update({
        where: { id: rt.id },
        data: { revokedAt: new Date() },
      });

      return { ok: true };
    }

    return { ok: true };
  }

  /**
   * OAuth login: find or create user by provider + provider ID.
   * If user exists with same email but different provider, link them.
   */
  async oauthLogin(params: {
    provider: string;
    providerId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
    role?: UserRole;
  }): Promise<{
    user: SafeAuthUser;
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    const email = params.email.trim().toLowerCase();
    const requestedRole = params.role ?? UserRole.CUSTOMER;

    // Try to find existing user by email
    let user = await this.prisma.user.findUnique({ where: { email } });
    let isNewUser = false;

    if (user) {
      // Link OAuth provider if not already set
      if (!user.authProvider) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            authProvider: params.provider,
            authProviderId: params.providerId,
            isEmailVerified: true, // OAuth emails are verified
            avatarUrl: user.avatarUrl || params.avatarUrl || null,
          },
        });
      }
    } else {
      // Create new user — generate a random password hash (user won't use password login)
      const randomPwd = randomBytes(32).toString('hex');
      const passwordHash = await hashPassword(randomPwd);

      user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName: params.fullName?.trim() || null,
          avatarUrl: params.avatarUrl || null,
          role: requestedRole,
          authProvider: params.provider,
          authProviderId: params.providerId,
          isEmailVerified: true, // OAuth emails are verified
        },
      });

      if (requestedRole === UserRole.VENDOR) {
        const displayName =
          params.fullName?.trim() || email.split('@')[0] || 'Vendor';
        await this.prisma.vendorProfile.create({
          data: { userId: user.id, displayName, status: 'PENDING' },
        });
      }

      isNewUser = true;
    }

    const accessToken = await this.signAccessToken(
      user.id,
      user.email,
      user.role,
    );
    const { refreshToken } = await this.issueRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        ...this.splitName(user.fullName),
      },
      accessToken,
      refreshToken,
      isNewUser,
    };
  }

  private async signAccessToken(userId: string, email: string, role: UserRole) {
    const payload: JwtAccessPayload = { sub: userId, email, role };
    return this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: this.accessExpiresSeconds(),
    });
  }

  private refreshExpiresSeconds(): number {
    return this.refreshExpiresDays() * 24 * 60 * 60;
  }

  private async issueRefreshToken(userId: string) {
    const payload: JwtRefreshPayload = { sub: userId, typ: 'refresh' };

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: this.refreshExpiresSeconds(),
    });

    const tokenHash = await hashToken(refreshToken);

    const record = await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt: this.refreshExpiryDate(),
      },
      select: { id: true },
    });

    return { refreshToken, recordId: record.id };
  }
}

function cryptoRandomToken(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}
