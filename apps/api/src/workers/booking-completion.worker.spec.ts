import { BookingStatus } from '@prisma/client';
import { BookingCompletionWorker } from './booking-completion.worker';
import { PrismaService } from '../modules/prisma/prisma.service';

describe('BookingCompletionWorker', () => {
  function buildWorker(overrides?: Partial<PrismaService>) {
    const prisma = {
      booking: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
      ...overrides,
    } as unknown as PrismaService;

    return { worker: new BookingCompletionWorker(prisma), prisma };
  }

  it('does nothing when no CONFIRMED bookings past checkout', async () => {
    const { worker, prisma } = buildWorker();
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    await worker.completeExpiredBookings();

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: BookingStatus.CONFIRMED,
          checkOut: { lt: expect.any(Date) },
        },
      }),
    );
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it('completes CONFIRMED bookings past checkout date', async () => {
    const { worker, prisma } = buildWorker();
    const pastBooking = { id: 'booking_1' };
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([pastBooking]);
    (prisma.booking.update as jest.Mock).mockResolvedValue({
      id: 'booking_1',
      status: BookingStatus.COMPLETED,
    });

    await worker.completeExpiredBookings();

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking_1', status: BookingStatus.CONFIRMED },
      data: {
        status: BookingStatus.COMPLETED,
        completedAt: expect.any(Date),
      },
    });
  });

  it('handles batch of multiple bookings', async () => {
    const { worker, prisma } = buildWorker();
    const bookings = [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }];
    (prisma.booking.findMany as jest.Mock).mockResolvedValue(bookings);
    (prisma.booking.update as jest.Mock).mockResolvedValue({});

    await worker.completeExpiredBookings();

    expect(prisma.booking.update).toHaveBeenCalledTimes(3);
  });

  it('skips already-completed bookings (P2025 error) without crashing', async () => {
    const { worker, prisma } = buildWorker();
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([
      { id: 'b_already' },
    ]);
    (prisma.booking.update as jest.Mock).mockRejectedValue(
      Object.assign(new Error('Record not found'), { code: 'P2025' }),
    );

    // Should not throw
    await worker.completeExpiredBookings();
  });

  it('logs errors for non-P2025 failures without crashing', async () => {
    const { worker, prisma } = buildWorker();
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([
      { id: 'b_fail' },
    ]);
    (prisma.booking.update as jest.Mock).mockRejectedValue(
      new Error('DB connection lost'),
    );

    // Should not throw
    await worker.completeExpiredBookings();
  });

  it('respects BATCH_SIZE limit of 200', async () => {
    const { worker, prisma } = buildWorker();
    (prisma.booking.findMany as jest.Mock).mockResolvedValue([]);

    await worker.completeExpiredBookings();

    expect(prisma.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 200 }),
    );
  });
});
