import {
  Controller,
  Sse,
  Req,
  MessageEvent,
  UnauthorizedException,
} from '@nestjs/common';
import { Observable, interval, switchMap, of, map, catchError } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

type JwtUser = { id: string; email: string; role: string };

/**
 * Server-Sent Events endpoint for real-time notifications.
 * Supports token via Authorization header or query parameter (for EventSource).
 */
@Controller('notifications')
export class NotificationsSseController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private extractToken(req: {
    headers?: Record<string, string>;
    query?: Record<string, string>;
  }): string | null {
    // Try Authorization header first
    const authHeader =
      req.headers?.['authorization'] ?? req.headers?.['Authorization'] ?? '';
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // Fall back to query param
    return req.query?.['token'] ?? null;
  }

  @Sse('stream')
  stream(
    @Req()
    req: {
      headers: Record<string, string>;
      query: Record<string, string>;
      user?: JwtUser;
    },
  ): Observable<MessageEvent> {
    // If a guard already set req.user, use it. Otherwise, verify manually.
    let userId: string;

    if (req.user?.id) {
      userId = req.user.id;
    } else {
      const token = this.extractToken(req);
      if (!token) {
        throw new UnauthorizedException('Missing authentication token');
      }

      try {
        const raw: { sub: string } = this.jwt.verify(token, {
          secret: process.env.JWT_ACCESS_SECRET,
        });
        userId = raw.sub;
      } catch {
        throw new UnauthorizedException('Invalid authentication token');
      }
    }

    return interval(10_000).pipe(
      switchMap(async () => {
        const [unreadCount, latest] = await Promise.all([
          this.prisma.notificationEvent.count({
            where: { recipientUserId: userId, readAt: null },
          }),
          this.prisma.notificationEvent.findMany({
            where: { recipientUserId: userId, readAt: null },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              id: true,
              type: true,
              entityType: true,
              entityId: true,
              createdAt: true,
            },
          }),
        ]);

        return { unreadCount, latest };
      }),
      catchError(() => of(null)),
      map(
        (data): MessageEvent => ({
          data: data ?? { unreadCount: 0, latest: [] },
          type: 'notification',
        }),
      ),
    );
  }
}
