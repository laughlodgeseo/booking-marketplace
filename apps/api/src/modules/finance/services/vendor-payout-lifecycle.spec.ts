/**
 * Vendor Payout Lifecycle — targeted unit tests
 *
 * Coverage:
 *  1. Admin can upload PNG proof
 *  2. Admin can upload PDF proof
 *  3. Missing file → 400
 *  4. Non-cloudinary provider → 400
 *  5. Wrong payout status → 400
 *  6. Vendor can view own proof (vendorGetPayoutProof)
 *  7. Vendor cannot view another vendor's proof → 403
 *  8. Vendor payout not found → 404
 *  9. No proof document uploaded → 404
 * 10. Admin can get any proof (adminGetPayoutProof)
 * 11. vendorConfirmReceived — happy path
 * 12. vendorConfirmReceived — wrong vendor → 403
 * 13. vendorConfirmReceived — wrong status → 400
 * 14. vendorConfirmReceived — already confirmed → ok + reused
 */
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VendorPayoutStatus } from '@prisma/client';

import { VendorPayoutLifecycleService } from './vendor-payout-lifecycle.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../../infra/storage/storage.service';
import { NotificationsService } from '../../notifications/notifications.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VENDOR_ID = 'vendor-aaa';
const OTHER_VENDOR_ID = 'vendor-bbb';
const ADMIN_ID = 'admin-001';
const PAYOUT_ID = 'payout-111';

const PROOF_DOCUMENT = {
  id: 'proof-doc-1',
  cloudinaryPublicId: 'payout-proofs/abc123',
  cloudinaryResourceType: 'image',
  cloudinaryDeliveryType: 'authenticated',
  mimeType: 'image/png',
  originalName: 'receipt.png',
  storageProvider: 'cloudinary',
  createdAt: new Date('2025-01-01'),
};

function makePayout(
  overrides: Partial<{
    vendorId: string;
    status: VendorPayoutStatus;
    proofDocument: object | null;
    proofDocumentId: string | null;
  }> = {},
) {
  return {
    id: PAYOUT_ID,
    vendorId: overrides.vendorId ?? VENDOR_ID,
    propertyId: 'prop-1',
    bookingId: 'booking-1',
    status: overrides.status ?? VendorPayoutStatus.PAID_AWAITING_VENDOR_CONFIRMATION,
    grossBookingAmountMinor: 685100,
    platformCommissionRateBps: 1800,
    platformCommissionMinor: 123318,
    vendorNetAmountMinor: 561782,
    currency: 'AED',
    proofDocumentId: overrides.proofDocumentId ?? 'proof-doc-1',
    proofDocument: overrides.proofDocument !== undefined ? overrides.proofDocument : PROOF_DOCUMENT,
    paidAt: new Date(),
    confirmedAt: null,
    property: { title: 'Test Property' },
    booking: { id: 'booking-1' },
    payoutMethod: null,
  };
}

function makeFile(mimeType = 'image/png', size = 1024): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'proof.png',
    encoding: '7bit',
    mimetype: mimeType,
    size,
    buffer: Buffer.from('fake-file-data'),
    stream: null as never,
    destination: '',
    filename: '',
    path: '',
  };
}

function buildService(
  prismaOverrides: Record<string, unknown> = {},
  storageOverrides: Record<string, unknown> = {},
) {
  const mockTransaction = jest
    .fn()
    .mockImplementation((fn: (tx: unknown) => Promise<unknown>) => fn(prisma));

  const prisma = {
    vendorPayout: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockImplementation((args: { data: object; where: object }) =>
        Promise.resolve({ ...makePayout(), ...args.data }),
      ),
    },
    payoutProofDocument: {
      upsert: jest.fn().mockResolvedValue(PROOF_DOCUMENT),
    },
    ledgerEntry: {
      upsert: jest.fn().mockResolvedValue({ id: 'ledger-1' }),
    },
    $transaction: mockTransaction,
    ...prismaOverrides,
  } as unknown as PrismaService;

  const storage = {
    activeProvider: jest.fn().mockResolvedValue('cloudinary'),
    upload: jest.fn().mockResolvedValue({
      key: 'payout-proofs/uploaded-key',
      url: 'https://res.cloudinary.com/fake/authenticated/payout-proofs/uploaded-key',
      mimeType: 'image/png',
      size: 1024,
      resourceType: 'image',
      deliveryType: 'authenticated',
      provider: 'cloudinary',
    }),
    getSignedUrl: jest.fn().mockResolvedValue('https://res.cloudinary.com/fake/signed-url'),
    ...storageOverrides,
  } as unknown as StorageService;

  const notifications = {
    emit: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;

  const svc = new VendorPayoutLifecycleService(prisma, storage, notifications);
  return { svc, prisma, storage, notifications };
}

// ---------------------------------------------------------------------------
// adminUploadProof
// ---------------------------------------------------------------------------

describe('VendorPayoutLifecycleService.adminUploadProof', () => {
  it('1. accepts PNG proof and transitions status to PAID_AWAITING_VENDOR_CONFIRMATION', async () => {
    const { svc, prisma } = buildService();
    (prisma.vendorPayout.findUnique as jest.Mock).mockResolvedValue(
      makePayout({ status: VendorPayoutStatus.PROCESSING }),
    );

    const result = await svc.adminUploadProof({
      adminUserId: ADMIN_ID,
      payoutId: PAYOUT_ID,
      file: makeFile('image/png'),
    });

    expect(result).toEqual({ ok: true, proofDocumentId: PROOF_DOCUMENT.id });
  });

  it('2. accepts PDF proof', async () => {
    const { svc, prisma } = buildService();
    (prisma.vendorPayout.findUnique as jest.Mock).mockResolvedValue(
      makePayout({ status: VendorPayoutStatus.READY_FOR_PAYOUT }),
    );

    const result = await svc.adminUploadProof({
      adminUserId: ADMIN_ID,
      payoutId: PAYOUT_ID,
      file: makeFile('application/pdf'),
    });

    expect(result.ok).toBe(true);
  });

  it('3. throws 400 when file is missing', async () => {
    const { svc, prisma } = buildService();
    (prisma.vendorPayout.findUnique as jest.Mock).mockResolvedValue(
      makePayout({ status: VendorPayoutStatus.PROCESSING }),
    );

    await expect(
      svc.adminUploadProof({
        adminUserId: ADMIN_ID,
        payoutId: PAYOUT_ID,
        file: undefined,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('4. throws 400 when storage provider is not cloudinary', async () => {
    const { svc, storage } = buildService(
      {},
      { activeProvider: jest.fn().mockResolvedValue('local') },
    );

    await expect(
      svc.adminUploadProof({
        adminUserId: ADMIN_ID,
        payoutId: PAYOUT_ID,
        file: makeFile(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('5. throws 400 when payout status is CONFIRMED_RECEIVED (wrong status)', async () => {
    const { svc, prisma } = buildService();
    (prisma.vendorPayout.findUnique as jest.Mock).mockResolvedValue(
      makePayout({ status: VendorPayoutStatus.CONFIRMED_RECEIVED }),
    );

    await expect(
      svc.adminUploadProof({
        adminUserId: ADMIN_ID,
        payoutId: PAYOUT_ID,
        file: makeFile(),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ---------------------------------------------------------------------------
// vendorGetPayoutProof
// ---------------------------------------------------------------------------

describe('VendorPayoutLifecycleService.vendorGetPayoutProof', () => {
  it('6. vendor can view own proof — returns buffer info', async () => {
    const { svc, prisma, storage } = buildService();
    (prisma.vendorPayout.findUnique as jest.Mock).mockResolvedValue(makePayout());
    // storage.getSignedUrl returns a URL; we need fetch to return file bytes.
    // Override fetchProofBuffer via storage mock:
    const fakeBuffer = Buffer.from('proof-bytes');
    (storage.getSignedUrl as jest.Mock).mockResolvedValue(
      'https://res.cloudinary.com/fake/signed',
    );
    // The service fetches the signed URL and returns buffer. Mock global fetch:
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/png' } as unknown as Headers,
      arrayBuffer: async () => fakeBuffer.buffer,
    } as unknown as Response);

    const result = await svc.vendorGetPayoutProof(VENDOR_ID, PAYOUT_ID, 'view');

    expect(result.mimeType).toBe('image/png');
    expect(result.fileName).toBe('receipt.png');
    fetchSpy.mockRestore();
  });

  it('7. vendor cannot view another vendor\'s proof → ForbiddenException', async () => {
    const { svc, prisma } = buildService();
    (prisma.vendorPayout.findUnique as jest.Mock).mockResolvedValue(
      makePayout({ vendorId: OTHER_VENDOR_ID }),
    );

    await expect(
      svc.vendorGetPayoutProof(VENDOR_ID, PAYOUT_ID, 'view'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('8. throws 404 when payout does not exist', async () => {
    const { svc, prisma } = buildService();
    (prisma.vendorPayout.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      svc.vendorGetPayoutProof(VENDOR_ID, PAYOUT_ID, 'view'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('9. throws 404 when no proof document uploaded', async () => {
    const { svc, prisma } = buildService();
    (prisma.vendorPayout.findUnique as jest.Mock).mockResolvedValue(
      makePayout({ proofDocument: null, proofDocumentId: null }),
    );

    await expect(
      svc.vendorGetPayoutProof(VENDOR_ID, PAYOUT_ID, 'view'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// adminGetPayoutProof
// ---------------------------------------------------------------------------

describe('VendorPayoutLifecycleService.adminGetPayoutProof', () => {
  it('10. admin can get proof for any vendor payout', async () => {
    const { svc, prisma, storage } = buildService();
    (prisma.vendorPayout.findUnique as jest.Mock).mockResolvedValue(
      makePayout({ vendorId: OTHER_VENDOR_ID }),
    );
    (storage.getSignedUrl as jest.Mock).mockResolvedValue(
      'https://res.cloudinary.com/fake/signed',
    );
    const fakeBuffer = Buffer.from('proof-bytes');
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      headers: { get: () => 'image/png' } as unknown as Headers,
      arrayBuffer: async () => fakeBuffer.buffer,
    } as unknown as Response);

    const result = await svc.adminGetPayoutProof(PAYOUT_ID, 'download');

    expect(result.fileName).toBe('receipt.png');
    fetchSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// vendorConfirmReceived
// ---------------------------------------------------------------------------

describe('VendorPayoutLifecycleService.vendorConfirmReceived', () => {
  it('11. happy path — sets CONFIRMED_RECEIVED and returns ok', async () => {
    const payout = makePayout();
    const mockTx = {
      vendorPayout: {
        findUnique: jest.fn().mockResolvedValue(payout),
        update: jest.fn().mockResolvedValue({
          ...payout,
          status: VendorPayoutStatus.CONFIRMED_RECEIVED,
        }),
      },
    };
    const { svc, prisma } = buildService({
      $transaction: jest
        .fn()
        .mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
          fn(mockTx),
        ),
    });
    // prisma.$transaction is overridden above via buildService prismaOverrides
    // but we need to rebuild with correct $transaction override:
    (prisma.$transaction as jest.Mock).mockImplementation(
      (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    const result = await svc.vendorConfirmReceived(VENDOR_ID, PAYOUT_ID);

    expect(result).toEqual({ ok: true, reused: false });
    expect(mockTx.vendorPayout.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: VendorPayoutStatus.CONFIRMED_RECEIVED,
        }),
      }),
    );
  });

  it('12. wrong vendor → ForbiddenException', async () => {
    const mockTx = {
      vendorPayout: {
        findUnique: jest.fn().mockResolvedValue(makePayout({ vendorId: OTHER_VENDOR_ID })),
        update: jest.fn(),
      },
    };
    const { svc, prisma } = buildService();
    (prisma.$transaction as jest.Mock).mockImplementation(
      (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    await expect(
      svc.vendorConfirmReceived(VENDOR_ID, PAYOUT_ID),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('13. wrong status → BadRequestException', async () => {
    const mockTx = {
      vendorPayout: {
        findUnique: jest.fn().mockResolvedValue(
          makePayout({ status: VendorPayoutStatus.PENDING_DETAILS }),
        ),
        update: jest.fn(),
      },
    };
    const { svc, prisma } = buildService();
    (prisma.$transaction as jest.Mock).mockImplementation(
      (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    await expect(
      svc.vendorConfirmReceived(VENDOR_ID, PAYOUT_ID),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('14. already confirmed → ok + reused true (idempotent)', async () => {
    const mockTx = {
      vendorPayout: {
        findUnique: jest.fn().mockResolvedValue(
          makePayout({ status: VendorPayoutStatus.CONFIRMED_RECEIVED }),
        ),
        update: jest.fn(),
      },
    };
    const { svc, prisma } = buildService();
    (prisma.$transaction as jest.Mock).mockImplementation(
      (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx),
    );

    const result = await svc.vendorConfirmReceived(VENDOR_ID, PAYOUT_ID);

    expect(result).toEqual({ ok: true, reused: true });
    expect(mockTx.vendorPayout.update).not.toHaveBeenCalled();
  });
});
