import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { NotificationType } from '@prisma/client';
import crypto from 'crypto';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private otpTtlMinutes(): number {
    const v = Number(process.env.EMAIL_OTP_TTL_MINUTES || '10');
    return Number.isFinite(v) && v > 0 ? v : 10;
  }

  private maxAttempts(): number {
    const v = Number(process.env.EMAIL_OTP_MAX_ATTEMPTS || '5');
    return Number.isFinite(v) && v > 0 ? v : 5;
  }

  /**
   * Minimum gap between OTP sends for the same user/email.
   * We return {ok:true} even if we do not send a new code (no leakage).
   */
  private resendCooldownSeconds(): number {
    const v = Number(process.env.EMAIL_OTP_RESEND_COOLDOWN_SECONDS || '60');
    return Number.isFinite(v) && v >= 0 ? v : 60;
  }

  /**
   * Maximum number of OTP requests allowed in a rolling window.
   * Exceeding this silently returns ok:true (no leakage).
   */
  private resendWindowMinutes(): number {
    const v = Number(process.env.EMAIL_OTP_RESEND_WINDOW_MINUTES || '60');
    return Number.isFinite(v) && v > 0 ? v : 60;
  }

  private resendMaxPerWindow(): number {
    const v = Number(process.env.EMAIL_OTP_RESEND_MAX_PER_WINDOW || '5');
    return Number.isFinite(v) && v > 0 ? v : 5;
  }

  private otpPepper(): string {
    // Pepper should be stable per environment; set in .env for production.
    return (
      process.env.EMAIL_OTP_PEPPER || process.env.JWT_SECRET || 'dev-otp-pepper'
    );
  }

  private smtpConfigured(): boolean {
    const host = this.readEnv('SMTP_HOST');
    const port = Number.parseInt(this.readEnv('SMTP_PORT'), 10);
    const user = this.readEnv('SMTP_USER');
    const pass = this.readEnv('SMTP_PASS');
    const from = this.readEnv('SMTP_FROM') || this.readEnv('SMTP_FROM_EMAIL');

    return (
      Boolean(host) &&
      Number.isFinite(port) &&
      port > 0 &&
      Boolean(user) &&
      Boolean(pass) &&
      Boolean(from)
    );
  }

  private readEnv(key: string): string {
    const raw = (process.env[key] || '').trim();
    if (raw.length >= 2) {
      const first = raw[0];
      const last = raw[raw.length - 1];
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        return raw.slice(1, -1).trim();
      }
    }
    return raw;
  }

  private generateOtp(): string {
    // 6-digit numeric OTP
    const n = crypto.randomInt(0, 1_000_000);
    return String(n).padStart(6, '0');
  }

  private hashOtp(otp: string): { stored: string } {
    // Store as "salt:hash" so we can validate later without extra DB fields.
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto
      .createHmac('sha256', this.otpPepper())
      .update(`${salt}:${otp}`)
      .digest('hex');

    return { stored: `${salt}:${hash}` };
  }

  private verifyOtpHash(otp: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    if (!salt || !hash) return false;

    const computed = crypto
      .createHmac('sha256', this.otpPepper())
      .update(`${salt}:${otp}`)
      .digest('hex');

    // timing-safe compare
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(computed, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Generic error to avoid security leakage.
   * We never reveal whether code was expired, missing, locked, etc.
   */
  private invalidOrExpired(): never {
    throw new BadRequestException('Invalid or expired code');
  }

  /**
   * Request OTP for currently authenticated user.
   * HARDENING:
   * - Silent success if already verified (no leakage)
   * - Resend cooldown (silent ok:true if within cooldown)
   * - Throttle max per window (silent ok:true if exceeded)
   * - Invalidates previous unused OTPs (already did)
   * - Never returns OTP or expiry details to client
   */
  async requestOtp(input: { userId: string; emailOverride?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, isEmailVerified: true },
    });

    if (!user) throw new BadRequestException('User not found');

    // No leakage: do not tell client they are already verified.
    if (user.isEmailVerified) return { ok: true };

    // V1 hardening: only verify the user's current email.
    // Ignore overrides to prevent validating a different email address silently.
    const email = user.email.trim().toLowerCase();
    if (!email) throw new BadRequestException('Email not found');

    if (!this.smtpConfigured()) {
      throw new ServiceUnavailableException(
        'Email delivery is temporarily unavailable. Please try again shortly.',
      );
    }

    const now = new Date();

    // Resend cooldown check (silent ok:true)
    const latest = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, email },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (latest) {
      const ageMs = now.getTime() - latest.createdAt.getTime();
      const cooldownMs = this.resendCooldownSeconds() * 1000;
      if (cooldownMs > 0 && ageMs >= 0 && ageMs < cooldownMs) {
        return { ok: true };
      }
    }

    // Rate cap per window (silent ok:true)
    const windowStart = new Date(
      now.getTime() - this.resendWindowMinutes() * 60_000,
    );

    const issuedInWindow = await this.prisma.emailVerificationToken.count({
      where: {
        userId: user.id,
        email,
        createdAt: { gte: windowStart },
      },
    });

    if (issuedInWindow >= this.resendMaxPerWindow()) {
      return { ok: true };
    }

    const otp = this.generateOtp();
    const { stored } = this.hashOtp(otp);

    const expiresAt = new Date(now.getTime() + this.otpTtlMinutes() * 60_000);

    // Invalidate all previous unused tokens for this user/email.
    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        email,
        usedAt: null,
      },
      data: { usedAt: now },
    });

    // Create new OTP row
    const token = await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email,
        otpHash: stored,
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });

    // Emit notification outbox event with OTP (worker delivers).
    // Do not return otp to client.
    await this.notifications.emit({
      type: NotificationType.EMAIL_VERIFICATION_OTP,
      // Use token id to avoid notification idempotency collisions for repeated OTP requests.
      entityType: 'email_verification_token',
      entityId: token.id,
      recipientUserId: user.id,
      payload: {
        email,
        otp,
        tokenId: token.id,
        expiresAt: token.expiresAt.toISOString(),
      },
    });

    // No leakage: do not return expiry/email.
    return { ok: true };
  }

  /**
   * Verify OTP for authenticated user.
   * HARDENING:
   * - Strict: only latest unused, non-expired token
   * - Attempt counting with burn-on-max
   * - Generic error messages only
   * - On success: mark token used + verify user + invalidate other unused tokens
   */
  async verifyOtp(input: { userId: string; otp: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, isEmailVerified: true },
    });

    if (!user) throw new BadRequestException('User not found');

    // Idempotent success (safe)
    if (user.isEmailVerified) return { ok: true };

    const now = new Date();
    const email = user.email.trim().toLowerCase();
    if (!email) this.invalidOrExpired();

    const token = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        email,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) this.invalidOrExpired();

    // If attempts already exceeded, burn token and fail generically
    if (token.attemptCount >= this.maxAttempts()) {
      await this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: now },
      });
      this.invalidOrExpired();
    }

    const ok = this.verifyOtpHash(input.otp, token.otpHash);

    if (!ok) {
      const updated = await this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { attemptCount: { increment: 1 } },
        select: { attemptCount: true },
      });

      if (updated.attemptCount >= this.maxAttempts()) {
        // burn token when it reaches max attempts
        await this.prisma.emailVerificationToken.update({
          where: { id: token.id },
          data: { usedAt: now },
        });
      }

      this.invalidOrExpired();
    }

    // Success: mark token used + verify user + invalidate any other unused tokens
    await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: now },
      });

      await tx.emailVerificationToken.updateMany({
        where: {
          userId: user.id,
          email,
          usedAt: null,
        },
        data: { usedAt: now },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { isEmailVerified: true },
      });
    });

    return { ok: true };
  }
}
