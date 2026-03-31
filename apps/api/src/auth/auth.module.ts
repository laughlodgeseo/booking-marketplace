import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RbacTestController } from './rbac-test.controller';

// ✅ NEW: OTP email verification
import { EmailVerificationController } from './email-verification/email-verification.controller';
import { EmailVerificationService } from './email-verification/email-verification.service';
import { OAuthController } from './oauth.controller';

// ✅ Assumed existing modules (standard in your repo structure)
import { PrismaModule } from '../modules/prisma/prisma.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
  imports: [JwtModule.register({}), PrismaModule, NotificationsModule],
  controllers: [
    AuthController,
    RbacTestController,
    EmailVerificationController,
    OAuthController,
  ],
  providers: [
    AuthService,
    JwtAccessStrategy,
    JwtRefreshStrategy,
    EmailVerificationService,
  ],
  exports: [AuthService, EmailVerificationService],
})
export class AuthModule {}
