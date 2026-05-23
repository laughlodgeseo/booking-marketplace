/**
 * P1 Hardening Tests — Admin Audit Log
 *
 * Tests:
 * 1. record() writes to DB with correct fields
 * 2. list() returns paginated results
 * 3. list() filters by action
 * 4. list() filters by targetType
 * 5. list() filters by actorId
 */
import { AdminAuditService } from './admin-audit.service';
import { PrismaService } from '../../modules/prisma/prisma.service';

const MOCK_LOG = {
  id: 'log_1',
  actorId: 'admin_1',
  actorEmail: 'admin@example.com',
  action: 'REFUND_ISSUED',
  targetType: 'Booking',
  targetId: 'booking_1',
  metadata: { amount: 5000 },
  ipAddress: '127.0.0.1',
  createdAt: new Date(),
};

function buildService() {
  const prisma = {
    adminActionLog: {
      create: jest.fn().mockResolvedValue(MOCK_LOG),
      findMany: jest.fn().mockResolvedValue([MOCK_LOG]),
      count: jest.fn().mockResolvedValue(1),
    },
  } as unknown as PrismaService;

  return { service: new AdminAuditService(prisma), prisma };
}

describe('P1 AUDIT — AdminAuditService', () => {
  it('record() creates an audit log entry with correct fields', async () => {
    const { service, prisma } = buildService();

    await service.record(prisma, {
      actorId: 'admin_1',
      actorEmail: 'admin@example.com',
      action: 'REFUND_ISSUED',
      targetType: 'Booking',
      targetId: 'booking_1',
      metadata: { amount: 5000 },
      ipAddress: '127.0.0.1',
    });

    expect(
      (prisma.adminActionLog as unknown as { create: jest.Mock }).create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'admin_1',
        action: 'REFUND_ISSUED',
        targetType: 'Booking',
        targetId: 'booking_1',
      }),
    });
  });

  it('list() returns paginated results with total', async () => {
    const { service } = buildService();
    const result = await service.list({ page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
  });

  it('list() filters by action', async () => {
    const { service, prisma } = buildService();
    (prisma.adminActionLog as unknown as { findMany: jest.Mock }).findMany.mockResolvedValue([]);
    (prisma.adminActionLog as unknown as { count: jest.Mock }).count.mockResolvedValue(0);

    const result = await service.list({ action: 'PROPERTY_APPROVED' });

    expect(
      (prisma.adminActionLog as unknown as { findMany: jest.Mock }).findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ action: 'PROPERTY_APPROVED' }),
      }),
    );
    expect(result.items).toHaveLength(0);
  });

  it('list() filters by actorId', async () => {
    const { service, prisma } = buildService();

    await service.list({ actorId: 'admin_2' });

    expect(
      (prisma.adminActionLog as unknown as { findMany: jest.Mock }).findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ actorId: 'admin_2' }),
      }),
    );
  });

  it('list() caps pageSize at 100', async () => {
    const { service, prisma } = buildService();

    await service.list({ pageSize: 999 });

    expect(
      (prisma.adminActionLog as unknown as { findMany: jest.Mock }).findMany,
    ).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });
});
