import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';
import type { Prisma } from '@prisma/client';

export type AuditAction =
  | 'PROPERTY_APPROVED'
  | 'PROPERTY_REJECTED'
  | 'PROPERTY_SUSPENDED'
  | 'PROPERTY_ARCHIVED'
  | 'PROPERTY_DOCUMENT_APPROVED'
  | 'PROPERTY_DOCUMENT_REJECTED'
  | 'VENDOR_APPROVED'
  | 'VENDOR_REJECTED'
  | 'VENDOR_SUSPENDED'
  | 'REFUND_ISSUED'
  | 'PAYOUT_APPROVED'
  | 'PAYOUT_MARKED_PAID'
  | 'BOOKING_CANCELLED_BY_ADMIN'
  | 'BOOKING_STATUS_OVERRIDDEN'
  | 'CUSTOMER_DOCUMENT_APPROVED'
  | 'CUSTOMER_DOCUMENT_REJECTED'
  | 'BLOCK_REQUEST_APPROVED'
  | 'BLOCK_REQUEST_REJECTED'
  | 'FX_RATES_UPDATED';

export interface AuditParams {
  actorId: string;
  actorEmail?: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record an admin action. Call inside the same DB transaction when possible
   * so the audit entry is rolled back if the action fails.
   */
  async record(
    tx: Prisma.TransactionClient | PrismaService,
    params: AuditParams,
  ): Promise<void> {
    await (tx as PrismaService).adminActionLog.create({
      data: {
        actorId: params.actorId,
        actorEmail: params.actorEmail ?? null,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata
          ? (params.metadata as Prisma.InputJsonValue)
          : undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  }

  async list(params: {
    page?: number;
    pageSize?: number;
    action?: string;
    targetType?: string;
    actorId?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

    const where: Prisma.AdminActionLogWhereInput = {};
    if (params.action) where.action = params.action;
    if (params.targetType) where.targetType = params.targetType;
    if (params.actorId) where.actorId = params.actorId;
    if (params.fromDate || params.toDate) {
      where.createdAt = {};
      if (params.fromDate) where.createdAt.gte = new Date(params.fromDate);
      if (params.toDate) where.createdAt.lte = new Date(params.toDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.adminActionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          actorId: true,
          actorEmail: true,
          action: true,
          targetType: true,
          targetId: true,
          metadata: true,
          ipAddress: true,
          createdAt: true,
        },
      }),
      this.prisma.adminActionLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
