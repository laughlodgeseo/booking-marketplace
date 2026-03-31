import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole, type User } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtAccessGuard } from '../../auth/guards/jwt-access.guard';
import { MessagingService } from './messaging.service';
import {
  AdminCreateThreadDto,
  CounterpartyCreateThreadDto,
  MessageBodyDto,
  MessageThreadListQueryDto,
} from './dto/message.dto';

@Controller('portal/admin/messages')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class AdminMessagesController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('threads')
  async listThreads(
    @CurrentUser() user: User,
    @Query() query: MessageThreadListQueryDto,
  ) {
    return this.messaging.listThreads({
      userId: user.id,
      role: user.role,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      unreadOnly: query.unreadOnly,
      topic: query.topic,
    });
  }

  @Post('threads')
  async createThread(
    @CurrentUser() user: User,
    @Body() dto: AdminCreateThreadDto,
  ) {
    return this.messaging.createThreadByAdmin({
      adminId: user.id,
      counterpartyUserId: dto.counterpartyUserId,
      counterpartyRole: dto.counterpartyRole,
      subject: dto.subject,
      topic: dto.topic,
      body: dto.body,
    });
  }

  @Get('threads/:threadId')
  async getThread(
    @CurrentUser() user: User,
    @Param('threadId') threadId: string,
  ) {
    return this.messaging.getThread(threadId, {
      userId: user.id,
      role: user.role,
    });
  }

  @Post('threads/:threadId/messages')
  async sendMessage(
    @CurrentUser() user: User,
    @Param('threadId') threadId: string,
    @Body() dto: MessageBodyDto,
  ) {
    return this.messaging.sendMessage(
      threadId,
      { userId: user.id, role: user.role },
      dto.body,
    );
  }
}

@Controller('portal/vendor/messages')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.VENDOR)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class VendorMessagesController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('threads')
  async listThreads(
    @CurrentUser() user: User,
    @Query() query: MessageThreadListQueryDto,
  ) {
    return this.messaging.listThreads({
      userId: user.id,
      role: user.role,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      unreadOnly: query.unreadOnly,
      topic: query.topic,
    });
  }

  @Post('threads')
  async createThread(
    @CurrentUser() user: User,
    @Body() dto: CounterpartyCreateThreadDto,
  ) {
    return this.messaging.createThreadByCounterparty({
      userId: user.id,
      role: UserRole.VENDOR,
      subject: dto.subject,
      topic: dto.topic,
      body: dto.body,
    });
  }

  @Get('threads/:threadId')
  async getThread(
    @CurrentUser() user: User,
    @Param('threadId') threadId: string,
  ) {
    return this.messaging.getThread(threadId, {
      userId: user.id,
      role: user.role,
    });
  }

  @Post('threads/:threadId/messages')
  async sendMessage(
    @CurrentUser() user: User,
    @Param('threadId') threadId: string,
    @Body() dto: MessageBodyDto,
  ) {
    return this.messaging.sendMessage(
      threadId,
      { userId: user.id, role: user.role },
      dto.body,
    );
  }
}

@Controller('portal/user/messages')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(UserRole.CUSTOMER)
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class UserMessagesController {
  constructor(private readonly messaging: MessagingService) {}

  @Get('threads')
  async listThreads(
    @CurrentUser() user: User,
    @Query() query: MessageThreadListQueryDto,
  ) {
    return this.messaging.listThreads({
      userId: user.id,
      role: user.role,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
      unreadOnly: query.unreadOnly,
      topic: query.topic,
    });
  }

  @Post('threads')
  async createThread(
    @CurrentUser() user: User,
    @Body() dto: CounterpartyCreateThreadDto,
  ) {
    return this.messaging.createThreadByCounterparty({
      userId: user.id,
      role: UserRole.CUSTOMER,
      subject: dto.subject,
      topic: dto.topic,
      body: dto.body,
    });
  }

  @Get('threads/:threadId')
  async getThread(
    @CurrentUser() user: User,
    @Param('threadId') threadId: string,
  ) {
    return this.messaging.getThread(threadId, {
      userId: user.id,
      role: user.role,
    });
  }

  @Post('threads/:threadId/messages')
  async sendMessage(
    @CurrentUser() user: User,
    @Param('threadId') threadId: string,
    @Body() dto: MessageBodyDto,
  ) {
    return this.messaging.sendMessage(
      threadId,
      { userId: user.id, role: user.role },
      dto.body,
    );
  }
}
