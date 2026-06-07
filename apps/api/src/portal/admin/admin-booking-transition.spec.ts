/**
 * A5 — Admin Booking Status Transition Matrix
 *
 * Tests:
 * 1. CANCELLED → CONFIRMED rejected
 * 2. FAILED → CONFIRMED rejected
 * 3. PENDING_PAYMENT → COMPLETED rejected
 * 4. CONFIRMED → CANCELLED allowed
 * 5. CONFIRMED → COMPLETED allowed
 * 6. COMPLETED → CANCELLED rejected
 */
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BookingStatus, UserRole } from '@prisma/client';
import { AdminPortalService } from './admin-portal.service';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { NotificationsService } from '../../modules/notifications/notifications.service';
import { AdminAuditService } from './admin-audit.service';
import { StorageService } from '../../infra/storage/storage.service';

function buildAdminService(bookingStatus: BookingStatus) {
  const auditRecord = jest.fn().mockResolvedValue(undefined);

  const prisma = {
    $transaction: jest.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          booking: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'booking_1',
              status: bookingStatus,
            }),
            update: jest.fn().mockResolvedValue({
              id: 'booking_1',
              status: bookingStatus,
            }),
          },
          adminActionLog: {
            create: jest.fn().mockResolvedValue({ id: 'log_1' }),
          },
        }),
    ),
  } as unknown as PrismaService;

  const notifications = {
    emit: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;

  const audit = {
    record: auditRecord,
  } as unknown as AdminAuditService;

  const storage = {} as unknown as StorageService;

  return new AdminPortalService(prisma, notifications, audit, storage);
}

const ADMIN_PARAMS = {
  userId: 'admin_1',
  actorEmail: 'admin@test.com',
  role: UserRole.ADMIN,
  bookingId: 'booking_1',
};

describe('A5 — Admin booking status transition matrix', () => {
  it('rejects CANCELLED → CONFIRMED transition', async () => {
    const service = buildAdminService(BookingStatus.CANCELLED);
    await expect(
      service.overrideBookingStatus({
        ...ADMIN_PARAMS,
        newStatus: BookingStatus.CONFIRMED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects FAILED → CONFIRMED transition', async () => {
    const service = buildAdminService(BookingStatus.FAILED);
    await expect(
      service.overrideBookingStatus({
        ...ADMIN_PARAMS,
        newStatus: BookingStatus.CONFIRMED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects PENDING_PAYMENT → COMPLETED transition', async () => {
    const service = buildAdminService(BookingStatus.PENDING_PAYMENT);
    await expect(
      service.overrideBookingStatus({
        ...ADMIN_PARAMS,
        newStatus: BookingStatus.COMPLETED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects COMPLETED → CANCELLED transition', async () => {
    const service = buildAdminService(BookingStatus.COMPLETED);
    await expect(
      service.overrideBookingStatus({
        ...ADMIN_PARAMS,
        newStatus: BookingStatus.CANCELLED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows CONFIRMED → CANCELLED transition', async () => {
    const service = buildAdminService(BookingStatus.CONFIRMED);
    const result = await service.overrideBookingStatus({
      ...ADMIN_PARAMS,
      newStatus: BookingStatus.CANCELLED,
      reason: 'admin test',
    });
    expect(result).toBeDefined();
  });

  it('allows CONFIRMED → COMPLETED transition', async () => {
    const service = buildAdminService(BookingStatus.CONFIRMED);
    const result = await service.overrideBookingStatus({
      ...ADMIN_PARAMS,
      newStatus: BookingStatus.COMPLETED,
      reason: 'admin test',
    });
    expect(result).toBeDefined();
  });

  it('allows PENDING_PAYMENT → CANCELLED transition', async () => {
    const service = buildAdminService(BookingStatus.PENDING_PAYMENT);
    const result = await service.overrideBookingStatus({
      ...ADMIN_PARAMS,
      newStatus: BookingStatus.CANCELLED,
      reason: 'no payment received',
    });
    expect(result).toBeDefined();
  });

  it('logs the override action with before/after status', async () => {
    const auditRecord = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      $transaction: jest.fn().mockImplementation(
        async (fn: (tx: unknown) => Promise<unknown>) =>
          fn({
            booking: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'booking_1',
                status: BookingStatus.CONFIRMED,
              }),
              update: jest.fn().mockResolvedValue({
                id: 'booking_1',
                status: BookingStatus.CANCELLED,
              }),
            },
          }),
      ),
    } as unknown as PrismaService;
    const audit = { record: auditRecord } as unknown as AdminAuditService;
    const service = new AdminPortalService(
      prisma,
      { emit: jest.fn() } as unknown as NotificationsService,
      audit,
      {} as unknown as StorageService,
    );

    await service.overrideBookingStatus({
      ...ADMIN_PARAMS,
      newStatus: BookingStatus.CANCELLED,
      reason: 'test reason',
    });

    expect(auditRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'BOOKING_STATUS_OVERRIDDEN',
        metadata: expect.objectContaining({
          previousStatus: BookingStatus.CONFIRMED,
          newStatus: BookingStatus.CANCELLED,
        }),
      }),
    );
  });
});
