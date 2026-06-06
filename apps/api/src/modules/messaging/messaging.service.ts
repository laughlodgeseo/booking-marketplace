import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageCounterpartyRole,
  MessageTopic,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CUSTOMER_CAPABLE_ROLES } from '../../common/rbac.constants';

type ThreadActor = {
  userId: string;
  role: UserRole;
};

type ThreadListInput = {
  userId: string;
  role: UserRole;
  page: number;
  pageSize: number;
  unreadOnly?: boolean;
  topic?: MessageTopic;
};

type CreateAdminThreadInput = {
  adminId: string;
  counterpartyUserId: string;
  counterpartyRole: MessageCounterpartyRole;
  subject?: string;
  topic?: MessageTopic;
  body: string;
};

type CreateCounterpartyThreadInput = {
  userId: string;
  role: Exclude<UserRole, 'ADMIN'>;
  subject?: string;
  topic?: MessageTopic;
  body: string;
};

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeText(input: string): string {
    const body = input.trim();
    if (!body) throw new BadRequestException('Message body is required.');
    return body;
  }

  private roleToCounterparty(role: UserRole): MessageCounterpartyRole {
    if (role === UserRole.VENDOR) return MessageCounterpartyRole.VENDOR;
    if (role === UserRole.CUSTOMER) return MessageCounterpartyRole.CUSTOMER;
    throw new BadRequestException('Invalid message counterparty role.');
  }

  private normalizeTopic(topic?: MessageTopic): MessageTopic {
    return topic ?? MessageTopic.OTHER;
  }

  private async resolveDefaultAdminId(): Promise<string> {
    const admin = await this.prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!admin) {
      throw new BadRequestException(
        'No admin user is available for messaging.',
      );
    }

    return admin.id;
  }

  private async assertThreadAccess(actor: ThreadActor, threadId: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        admin: { select: { id: true, email: true, fullName: true } },
        counterpartyUser: { select: { id: true, email: true, fullName: true } },
      },
    });

    if (!thread) throw new NotFoundException('Message thread not found.');

    if (actor.role === UserRole.ADMIN) {
      if (thread.adminId !== actor.userId) {
        throw new ForbiddenException('Not allowed to access this thread.');
      }
      return thread;
    }

    const actorCounterpartyRole = this.roleToCounterparty(actor.role);
    if (
      thread.counterpartyUserId !== actor.userId ||
      thread.counterpartyRole !== actorCounterpartyRole
    ) {
      throw new ForbiddenException('Not allowed to access this thread.');
    }

    return thread;
  }

  private async markThreadRead(
    threadId: string,
    actor: ThreadActor,
  ): Promise<void> {
    if (actor.role === UserRole.ADMIN) {
      await this.prisma.messageThread.update({
        where: { id: threadId },
        data: { adminLastReadAt: new Date() },
      });
      return;
    }

    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { counterpartyLastReadAt: new Date() },
    });
  }

  async listThreads(input: ThreadListInput) {
    const page = input.page > 0 ? input.page : 1;
    const pageSize = input.pageSize > 0 ? input.pageSize : 20;

    const where =
      input.role === UserRole.ADMIN
        ? {
            adminId: input.userId,
            ...(input.topic ? { topic: input.topic } : {}),
          }
        : {
            counterpartyUserId: input.userId,
            counterpartyRole: this.roleToCounterparty(input.role),
            ...(input.topic ? { topic: input.topic } : {}),
          };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.messageThread.count({ where }),
      this.prisma.messageThread.findMany({
        where,
        orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          admin: { select: { id: true, email: true, fullName: true } },
          counterpartyUser: {
            select: { id: true, email: true, fullName: true },
          },
        },
      }),
    ]);

    const items = await Promise.all(
      rows.map(async (thread) => {
        const readAt =
          input.role === UserRole.ADMIN
            ? thread.adminLastReadAt
            : thread.counterpartyLastReadAt;

        const unreadCount = await this.prisma.message.count({
          where: {
            threadId: thread.id,
            senderId: { not: input.userId },
            ...(readAt ? { createdAt: { gt: readAt } } : {}),
          },
        });

        return {
          id: thread.id,
          subject: thread.subject,
          topic: thread.topic,
          admin: thread.admin,
          counterpartyUser: thread.counterpartyUser,
          counterpartyRole: thread.counterpartyRole,
          lastMessageAt: thread.lastMessageAt,
          lastMessagePreview: thread.lastMessagePreview,
          unreadCount,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
        };
      }),
    );

    const filtered = input.unreadOnly
      ? items.filter((item) => item.unreadCount > 0)
      : items;

    return {
      page,
      pageSize,
      total,
      items: filtered,
    };
  }

  async getThread(threadId: string, actor: ThreadActor) {
    const thread = await this.assertThreadAccess(actor, threadId);

    const messages = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderId: true,
        sender: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    await this.markThreadRead(threadId, actor);

    return {
      id: thread.id,
      subject: thread.subject,
      topic: thread.topic,
      admin: thread.admin,
      counterpartyUser: thread.counterpartyUser,
      counterpartyRole: thread.counterpartyRole,
      lastMessageAt: thread.lastMessageAt,
      lastMessagePreview: thread.lastMessagePreview,
      messages,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    };
  }

  async sendMessage(threadId: string, actor: ThreadActor, bodyRaw: string) {
    const thread = await this.assertThreadAccess(actor, threadId);
    const body = this.normalizeText(bodyRaw);

    const message = await this.prisma.message.create({
      data: {
        threadId,
        senderId: actor.userId,
        body,
      },
      select: {
        id: true,
        body: true,
        createdAt: true,
        senderId: true,
      },
    });

    const patch =
      actor.role === UserRole.ADMIN
        ? {
            lastMessageAt: message.createdAt,
            lastMessagePreview: body.slice(0, 280),
            lastMessageSenderId: actor.userId,
            adminLastReadAt: message.createdAt,
          }
        : {
            lastMessageAt: message.createdAt,
            lastMessagePreview: body.slice(0, 280),
            lastMessageSenderId: actor.userId,
            counterpartyLastReadAt: message.createdAt,
          };

    await this.prisma.messageThread.update({
      where: { id: thread.id },
      data: patch,
    });

    return {
      ok: true,
      message,
    };
  }

  async createThreadByAdmin(input: CreateAdminThreadInput) {
    const counterpartyUser = await this.prisma.user.findUnique({
      where: { id: input.counterpartyUserId },
      select: { id: true, role: true },
    });

    if (!counterpartyUser) {
      throw new NotFoundException('Counterparty user not found.');
    }

    // VENDOR is customer-capable: an admin may address a VENDOR user as a CUSTOMER counterparty.
    const isValidCounterparty =
      input.counterpartyRole === MessageCounterpartyRole.VENDOR
        ? counterpartyUser.role === UserRole.VENDOR
        : CUSTOMER_CAPABLE_ROLES.includes(counterpartyUser.role);

    if (!isValidCounterparty) {
      throw new BadRequestException(
        'Counterparty role does not match user role.',
      );
    }

    const body = this.normalizeText(input.body);
    const subject = input.subject?.trim() || null;
    const topic = this.normalizeTopic(input.topic);

    const thread = await this.prisma.messageThread.upsert({
      where: {
        adminId_counterpartyUserId: {
          adminId: input.adminId,
          counterpartyUserId: input.counterpartyUserId,
        },
      },
      update: {
        counterpartyRole: input.counterpartyRole,
        subject: subject ?? undefined,
        topic,
      },
      create: {
        adminId: input.adminId,
        counterpartyUserId: input.counterpartyUserId,
        counterpartyRole: input.counterpartyRole,
        subject,
        topic,
      },
    });

    await this.sendMessage(
      thread.id,
      { userId: input.adminId, role: UserRole.ADMIN },
      body,
    );

    return this.getThread(thread.id, {
      userId: input.adminId,
      role: UserRole.ADMIN,
    });
  }

  async createThreadByCounterparty(input: CreateCounterpartyThreadInput) {
    const adminId = await this.resolveDefaultAdminId();
    if (input.role === UserRole.CUSTOMER && !input.topic) {
      throw new BadRequestException('Message topic is required.');
    }

    const role = this.roleToCounterparty(input.role);
    const body = this.normalizeText(input.body);
    const subject = input.subject?.trim() || null;
    const topic = this.normalizeTopic(input.topic);

    const thread = await this.prisma.messageThread.upsert({
      where: {
        adminId_counterpartyUserId: {
          adminId,
          counterpartyUserId: input.userId,
        },
      },
      update: {
        counterpartyRole: role,
        subject: subject ?? undefined,
        topic,
      },
      create: {
        adminId,
        counterpartyUserId: input.userId,
        counterpartyRole: role,
        subject,
        topic,
      },
    });

    await this.sendMessage(
      thread.id,
      { userId: input.userId, role: input.role },
      body,
    );

    return this.getThread(thread.id, {
      userId: input.userId,
      role: input.role,
    });
  }
}
