import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  LoginDto,
  RegisterDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';

import { EmailVerificationService } from './email-verification/email-verification.service';

type Cookies = Partial<Record<string, string>>;

type AccessUser = {
  id: string;
  email?: string;
  role?: string;
};

type RefreshUser = {
  id: string;
  refreshToken: string;
};

type AccessRequest = Omit<Request, 'user' | 'cookies'> & {
  user: AccessUser;
  cookies?: Cookies;
};

type RefreshRequest = Omit<Request, 'user' | 'cookies'> & {
  user: RefreshUser;
  cookies?: Cookies;
};

type RegisterResult = {
  user: {
    id: string;
    email: string;
    role: string;
    isEmailVerified: boolean;
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
  };
};

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly auth: AuthService,
    private readonly emailVerification: EmailVerificationService,
  ) {}

  private cookieName() {
    return process.env.AUTH_COOKIE_NAME || 'rentpropertyuae_rt';
  }

  /**
   * IMPORTANT:
   * - Production (Vercel → Render): SameSite=None + Secure
   * - Development (localhost): SameSite=Lax
   */
  private cookieOptions() {
    const isProd = process.env.NODE_ENV === 'production';

    const envSecure = process.env.AUTH_COOKIE_SECURE;
    const envSameSite = process.env.AUTH_COOKIE_SAMESITE;
    const envDomain = process.env.AUTH_COOKIE_DOMAIN;

    const secure = envSecure !== undefined ? envSecure === 'true' : isProd;

    const sameSite = (
      envSameSite !== undefined ? envSameSite : isProd ? 'none' : 'lax'
    ) as 'lax' | 'strict' | 'none';

    return {
      httpOnly: true,
      secure, // REQUIRED when SameSite=None
      sameSite, // none in prod, lax in dev
      domain: envDomain || undefined,
      path: '/',
    } as const;
  }

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto) {
    const result = (await this.auth.register(
      dto.email,
      dto.password,
      dto.fullName,
      dto.role,
    )) as RegisterResult;

    const userId = result.user.id;
    if (userId) {
      this.emailVerification.requestOtp({ userId }).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown OTP dispatch error';
        this.logger.warn(
          `OTP dispatch queue failed for userId=${userId}: ${message}`,
        );
      });
    }

    return result;
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.login(dto.email, dto.password);

    res.cookie(this.cookieName(), result.refreshToken, {
      ...this.cookieOptions(),
      maxAge:
        1000 *
        60 *
        60 *
        24 *
        Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '30'),
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(
    @Req() req: RefreshRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userId = req.user.id;
    const refreshToken = req.user.refreshToken;

    const result = await this.auth.refresh(userId, refreshToken);

    res.cookie(this.cookieName(), result.refreshToken, {
      ...this.cookieOptions(),
      maxAge:
        1000 *
        60 *
        60 *
        24 *
        Number(process.env.JWT_REFRESH_EXPIRES_IN_DAYS || '30'),
    });

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @UseGuards(JwtAccessGuard)
  async logout(
    @Req() req: AccessRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.cookieName();
    const token = req.cookies?.[cookieName];

    await this.auth.logout(req.user.id, token);
    res.clearCookie(cookieName, this.cookieOptions());

    return { ok: true };
  }

  @Post('request-password-reset')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('request-otp')
  @UseGuards(JwtAccessGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestOtp(@Req() req: AccessRequest) {
    return this.emailVerification.requestOtp({ userId: req.user.id });
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.newPassword);
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  async me(@Req() req: AccessRequest) {
    return this.auth.me(req.user.id);
  }
}
