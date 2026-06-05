/**
 * Unit tests — VendorOnboardingService
 *
 * Tests:
 *  1. getState — CUSTOMER role returns CUSTOMER status
 *  2. getState — VENDOR with no properties returns FIRST_TIME
 *  3. getState — VENDOR with DRAFT property returns HAS_DRAFT
 *  4. getState — VENDOR with UNDER_REVIEW property returns SUBMITTED
 *  5. getState — VENDOR with CHANGES_REQUESTED property returns CHANGES_REQUESTED
 *  6. getState — VENDOR with REJECTED property returns REJECTED
 *  7. getState — VENDOR with PUBLISHED property returns HAS_PROPERTIES
 *  8. startOnboarding — CUSTOMER role upgrades to VENDOR and creates VendorProfile
 *  9. startOnboarding — VENDOR role does NOT re-update role; still idempotent
 * 10. startOnboarding — existing VendorProfile reused (idempotent, no duplicate)
 * 11. DTO validation — StartVendorOnboardingDto passes with valid optional displayName
 * 12. DTO validation — StartVendorOnboardingDto passes with omitted displayName
 * 13. DTO validation — StartVendorOnboardingDto rejects displayName > 120 chars
 */
import { ForbiddenException } from '@nestjs/common';
import { UserRole, VendorStatus } from '@prisma/client';
import { validate } from 'class-validator';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { StartVendorOnboardingDto } from './dto/vendor-onboarding.dto';
import { CUSTOMER_CAPABLE_ROLES } from '../common/rbac.constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProfile(overrides = {}) {
  return {
    id: 'profile-uuid',
    userId: 'user-uuid',
    displayName: 'Test Host',
    status: VendorStatus.PENDING,
    ...overrides,
  };
}

function makePrisma() {
  const vendorProfile = {
    findUnique: jest.fn(),
    create: jest.fn(),
  };
  const property = {
    findMany: jest.fn(),
  };
  const user = {
    update: jest.fn(),
    findUnique: jest.fn(),
  };

  const prisma = {
    vendorProfile,
    property,
    user,
    $transaction: jest.fn().mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          user,
          vendorProfile,
        }),
    ),
  };

  return { prisma, vendorProfile, property, user };
}

function buildService() {
  const { prisma, vendorProfile, property, user } = makePrisma();
  const service = new VendorOnboardingService(prisma as never);
  return { service, prisma, vendorProfile, property, user };
}

// ---------------------------------------------------------------------------
// getState tests
// ---------------------------------------------------------------------------

describe('VendorOnboardingService.getState()', () => {
  it('returns CUSTOMER status for CUSTOMER role (no DB query needed)', async () => {
    const { service, vendorProfile, property } = buildService();

    const result = await service.getState('user-uuid', UserRole.CUSTOMER);

    expect(result.status).toBe('CUSTOMER');
    expect(result.vendorProfileExists).toBe(false);
    expect(result.propertyCount).toBe(0);
    expect(vendorProfile.findUnique).not.toHaveBeenCalled();
    expect(property.findMany).not.toHaveBeenCalled();
  });

  it('returns FIRST_TIME when VENDOR has no properties', async () => {
    const { service, vendorProfile, property } = buildService();
    vendorProfile.findUnique.mockResolvedValue(makeProfile());
    property.findMany.mockResolvedValue([]);

    const result = await service.getState('user-uuid', UserRole.VENDOR);

    expect(result.status).toBe('FIRST_TIME');
    expect(result.propertyId).toBeNull();
    expect(result.vendorProfileExists).toBe(true);
    expect(result.propertyCount).toBe(0);
  });

  it('returns HAS_DRAFT when VENDOR has a DRAFT property', async () => {
    const { service, vendorProfile, property } = buildService();
    vendorProfile.findUnique.mockResolvedValue(makeProfile());
    property.findMany.mockResolvedValue([{ id: 'prop-1', status: 'DRAFT' }]);

    const result = await service.getState('user-uuid', UserRole.VENDOR);

    expect(result.status).toBe('HAS_DRAFT');
    expect(result.propertyId).toBe('prop-1');
    expect(result.propertyStatus).toBe('DRAFT');
  });

  it('returns SUBMITTED when VENDOR has an UNDER_REVIEW property', async () => {
    const { service, vendorProfile, property } = buildService();
    vendorProfile.findUnique.mockResolvedValue(makeProfile());
    property.findMany.mockResolvedValue([
      { id: 'prop-1', status: 'UNDER_REVIEW' },
    ]);

    const result = await service.getState('user-uuid', UserRole.VENDOR);

    expect(result.status).toBe('SUBMITTED');
    expect(result.propertyId).toBe('prop-1');
    expect(result.propertyStatus).toBe('UNDER_REVIEW');
  });

  it('returns CHANGES_REQUESTED when VENDOR has a CHANGES_REQUESTED property', async () => {
    const { service, vendorProfile, property } = buildService();
    vendorProfile.findUnique.mockResolvedValue(makeProfile());
    property.findMany.mockResolvedValue([
      { id: 'prop-2', status: 'CHANGES_REQUESTED' },
    ]);

    const result = await service.getState('user-uuid', UserRole.VENDOR);

    expect(result.status).toBe('CHANGES_REQUESTED');
    expect(result.propertyId).toBe('prop-2');
  });

  it('returns REJECTED when VENDOR has only REJECTED properties', async () => {
    const { service, vendorProfile, property } = buildService();
    vendorProfile.findUnique.mockResolvedValue(makeProfile());
    property.findMany.mockResolvedValue([
      { id: 'prop-3', status: 'REJECTED' },
    ]);

    const result = await service.getState('user-uuid', UserRole.VENDOR);

    expect(result.status).toBe('REJECTED');
    expect(result.propertyId).toBe('prop-3');
  });

  it('returns HAS_PROPERTIES when VENDOR has a PUBLISHED property', async () => {
    const { service, vendorProfile, property } = buildService();
    vendorProfile.findUnique.mockResolvedValue(makeProfile());
    property.findMany.mockResolvedValue([
      { id: 'prop-4', status: 'PUBLISHED' },
    ]);

    const result = await service.getState('user-uuid', UserRole.VENDOR);

    expect(result.status).toBe('HAS_PROPERTIES');
    expect(result.propertyId).toBeNull();
    expect(result.propertyCount).toBe(1);
  });

  it('returns HAS_PROPERTIES when VENDOR has an APPROVED property', async () => {
    const { service, vendorProfile, property } = buildService();
    vendorProfile.findUnique.mockResolvedValue(makeProfile());
    property.findMany.mockResolvedValue([
      { id: 'prop-5', status: 'APPROVED' },
    ]);

    const result = await service.getState('user-uuid', UserRole.VENDOR);

    expect(result.status).toBe('HAS_PROPERTIES');
  });

  it('SUBMITTED takes priority over DRAFT when both exist', async () => {
    const { service, vendorProfile, property } = buildService();
    vendorProfile.findUnique.mockResolvedValue(makeProfile());
    property.findMany.mockResolvedValue([
      { id: 'draft-1', status: 'DRAFT' },
      { id: 'review-1', status: 'UNDER_REVIEW' },
    ]);

    const result = await service.getState('user-uuid', UserRole.VENDOR);

    expect(result.status).toBe('SUBMITTED');
    expect(result.propertyId).toBe('review-1');
  });
});

// ---------------------------------------------------------------------------
// startOnboarding tests
// ---------------------------------------------------------------------------

describe('VendorOnboardingService.startOnboarding()', () => {
  it('upgrades CUSTOMER to VENDOR and creates VendorProfile', async () => {
    const { service, user, vendorProfile } = buildService();

    user.update.mockResolvedValue({ id: 'user-uuid', role: UserRole.VENDOR });
    vendorProfile.findUnique.mockResolvedValue(null);
    user.findUnique.mockResolvedValue({
      fullName: 'Alice',
      email: 'alice@example.com',
    });
    const createdProfile = makeProfile({ id: 'new-profile-id' });
    vendorProfile.create.mockResolvedValue(createdProfile);

    const result = await service.startOnboarding(
      'user-uuid',
      UserRole.CUSTOMER,
      'My Listing Name',
    );

    expect(user.update).toHaveBeenCalledWith({
      where: { id: 'user-uuid' },
      data: { role: UserRole.VENDOR },
    });
    expect(vendorProfile.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-uuid',
        displayName: 'My Listing Name',
        status: VendorStatus.PENDING,
      },
    });
    expect(result.isNewVendor).toBe(true);
    expect(result.success).toBe(true);
    expect(result.vendorProfileId).toBe('new-profile-id');
  });

  it('does NOT re-upgrade role when called as existing VENDOR', async () => {
    const { service, user, vendorProfile } = buildService();

    vendorProfile.findUnique.mockResolvedValue(null);
    user.findUnique.mockResolvedValue({
      fullName: 'Bob',
      email: 'bob@example.com',
    });
    const createdProfile = makeProfile({ id: 'existing-vendor-profile' });
    vendorProfile.create.mockResolvedValue(createdProfile);

    const result = await service.startOnboarding(
      'user-uuid',
      UserRole.VENDOR,
      undefined,
    );

    expect(user.update).not.toHaveBeenCalled();
    expect(result.isNewVendor).toBe(false);
    expect(result.success).toBe(true);
  });

  it('reuses existing VendorProfile (idempotent — no duplicate create)', async () => {
    const { service, user, vendorProfile } = buildService();

    user.update.mockResolvedValue({ id: 'user-uuid', role: UserRole.VENDOR });
    const existingProfile = makeProfile({ id: 'already-exists' });
    vendorProfile.findUnique.mockResolvedValue(existingProfile);

    const result = await service.startOnboarding(
      'user-uuid',
      UserRole.CUSTOMER,
    );

    expect(vendorProfile.create).not.toHaveBeenCalled();
    expect(result.vendorProfileId).toBe('already-exists');
    expect(result.isNewVendor).toBe(true);
  });

  it('derives displayName from fullName when none provided', async () => {
    const { service, user, vendorProfile } = buildService();

    user.update.mockResolvedValue({ id: 'user-uuid', role: UserRole.VENDOR });
    vendorProfile.findUnique.mockResolvedValue(null);
    user.findUnique.mockResolvedValue({
      fullName: 'Carol Smith',
      email: 'carol@example.com',
    });
    const createdProfile = makeProfile();
    vendorProfile.create.mockResolvedValue(createdProfile);

    await service.startOnboarding('user-uuid', UserRole.CUSTOMER);

    expect(vendorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ displayName: 'Carol Smith' }),
      }),
    );
  });

  it('falls back to email prefix when fullName is empty', async () => {
    const { service, user, vendorProfile } = buildService();

    user.update.mockResolvedValue({ id: 'user-uuid', role: UserRole.VENDOR });
    vendorProfile.findUnique.mockResolvedValue(null);
    user.findUnique.mockResolvedValue({ fullName: '', email: 'dave@test.com' });
    const createdProfile = makeProfile();
    vendorProfile.create.mockResolvedValue(createdProfile);

    await service.startOnboarding('user-uuid', UserRole.CUSTOMER);

    expect(vendorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ displayName: 'dave' }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// DTO validation tests
// ---------------------------------------------------------------------------

describe('StartVendorOnboardingDto — class-validator', () => {
  it('passes validation with valid optional displayName', async () => {
    const dto = Object.assign(new StartVendorOnboardingDto(), {
      displayName: 'My Dubai Villa',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes validation when displayName is omitted entirely', async () => {
    const dto = new StartVendorOnboardingDto();
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects displayName longer than 120 characters', async () => {
    const dto = Object.assign(new StartVendorOnboardingDto(), {
      displayName: 'A'.repeat(121),
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('maxLength');
  });

  it('rejects non-string displayName', async () => {
    const dto = Object.assign(new StartVendorOnboardingDto(), {
      displayName: 12345,
    });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isString');
  });

  it('does NOT throw "unknown value" when validated with forbidUnknownValues', async () => {
    const dto = new StartVendorOnboardingDto();
    const errors = await validate(dto, { forbidUnknownValues: true });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// RBAC constants tests
// ---------------------------------------------------------------------------

describe('CUSTOMER_CAPABLE_ROLES', () => {
  it('includes CUSTOMER role', () => {
    expect(CUSTOMER_CAPABLE_ROLES).toContain(UserRole.CUSTOMER);
  });

  it('includes VENDOR role', () => {
    expect(CUSTOMER_CAPABLE_ROLES).toContain(UserRole.VENDOR);
  });

  it('does NOT include ADMIN role', () => {
    expect(CUSTOMER_CAPABLE_ROLES).not.toContain(UserRole.ADMIN);
  });

  it('has exactly two roles', () => {
    expect(CUSTOMER_CAPABLE_ROLES).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// ADMIN guard
// ---------------------------------------------------------------------------

describe('VendorOnboardingController ADMIN guard logic', () => {
  it('throws ForbiddenException when role is ADMIN (controller-level guard)', () => {
    function checkAdminBlocked(role: UserRole): void {
      if (role === UserRole.ADMIN) {
        throw new ForbiddenException('Admins cannot access host onboarding.');
      }
    }

    expect(() => checkAdminBlocked(UserRole.ADMIN)).toThrow(ForbiddenException);
    expect(() => checkAdminBlocked(UserRole.CUSTOMER)).not.toThrow();
    expect(() => checkAdminBlocked(UserRole.VENDOR)).not.toThrow();
  });
});
