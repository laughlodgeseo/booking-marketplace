import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAccessGuard } from '../guards/jwt-access.guard';
import { EmailVerificationService } from './email-verification.service';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { VerifyEmailOtpDto } from './dto/verify-email-otp.dto';
import { Throttle } from '@nestjs/throttler';

type AccessUser = {
  id: string;
  email?: string;
  role?: string;
};

type MaybeAccessRequest = Omit<Request, 'user'> & {
  user?: AccessUser;
};

type GuardedAccessRequest = Omit<Request, 'user'> & {
  user: AccessUser;
};

@Controller('auth/email-verification')
export class EmailVerificationController {
  constructor(private readonly svc: EmailVerificationService) {}

  @Post('request')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async request(
    @Req() req: MaybeAccessRequest,
    @Body() dto: RequestEmailVerificationDto,
  ) {
    return this.svc.requestOtp({
      userId: req.user?.id,
      email: dto.email,
    });
  }

  @Post('verify')
  @UseGuards(JwtAccessGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async verify(
    @Req() req: GuardedAccessRequest,
    @Body() dto: VerifyEmailOtpDto,
  ) {
    return this.svc.verifyOtp({
      userId: req.user.id,
      otp: dto.otp,
    });
  }
}
