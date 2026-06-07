import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../../infra/redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  getHealth() {
    return { ok: true, service: 'api', ts: new Date().toISOString() };
  }

  @Get('deep')
  @ApiOperation({ summary: 'Deep health check — verifies DB and Redis' })
  async getDeepHealth() {
    const timestamp = new Date().toISOString();

    const dbStatus = await this.checkDatabase();
    const redisStatus = await this.checkRedis();

    const overall =
      dbStatus === 'ok' && (redisStatus === 'ok' || redisStatus === 'not_configured')
        ? 'ok'
        : 'degraded';

    return {
      status: overall,
      db: dbStatus,
      redis: redisStatus,
      timestamp,
    };
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch {
      return 'error';
    }
  }

  private async checkRedis(): Promise<'ok' | 'error' | 'not_configured'> {
    const url = process.env.REDIS_URL ?? '';
    if (!url) return 'not_configured';

    try {
      if (!this.redis.isReady) return 'error';
      await this.redis.client.ping();
      return 'ok';
    } catch {
      return 'error';
    }
  }

  @Get('email/failures')
  @ApiOperation({
    summary: 'List recent failed email notifications',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAccessGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listEmailFailures(@Query('limit') limitRaw?: string) {
    const parsed = Number(limitRaw);
    const limit =
      Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 50;

    return {
      ok: true,
      limit: Math.min(200, Math.max(1, limit)),
      items: await this.notifications.findRecentFailures(limit),
    };
  }
}
