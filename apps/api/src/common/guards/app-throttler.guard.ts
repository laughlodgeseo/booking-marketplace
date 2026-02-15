import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ThrottlerGuard, type ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const retryAfterSeconds =
      throttlerLimitDetail.timeToBlockExpire > 0
        ? throttlerLimitDetail.timeToBlockExpire
        : throttlerLimitDetail.timeToExpire;

    throw new HttpException(
      {
        ok: false,
        message: 'Too many requests. Please try again later.',
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
