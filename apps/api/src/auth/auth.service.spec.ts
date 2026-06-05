import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';

// Mock password/token utils so tests don't actually hash
jest.mock('../common/security/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed_pw'),
  verifyPassword: jest.fn().mockResolvedValue(true),
}));
jest.mock('../common/security/token-hash', () => ({
  hashToken: jest.fn().mockResolvedValue('bcrypt_hashed_token'),
  verifyToken: jest.fn().mockResolvedValue(true),
  hashTokenDeterministic: jest.fn().mockReturnValue('sha256_lookup_hash'),
}));

const { verifyPassword } = require('../common/security/password');
const { verifyToken } = require('../common/security/token-hash');

function buildService() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vendorProfile: { create: jest.fn() },
    refreshToken: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
  };

  const jwt = {
    signAsync: jest.fn().mockResolvedValue('mock_jwt_token'),
  };
  const notifications = {
    emit: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AuthService(
    prisma as never,
    jwt as never,
    notifications as never,
  );
  return { service, prisma, jwt, notifications };
}

describe('AuthService', () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test_access_secret_32_chars_minimum';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32_chars_minimum';
    process.env.APP_ORIGIN = 'http://localhost:3000';
  });

  describe('register', () => {
    it('creates customer by default', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        role: UserRole.CUSTOMER,
        isEmailVerified: false,
        fullName: 'John Doe',
      });

      const result = await service.register('user@test.com', 'password123');
      expect(result.user.role).toBe(UserRole.CUSTOMER);
      expect(prisma.vendorProfile.create).not.toHaveBeenCalled();
    });

    it('creates vendor profile when role is VENDOR', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u2',
        email: 'vendor@test.com',
        role: UserRole.VENDOR,
        isEmailVerified: false,
        fullName: 'Vendor Name',
      });
      prisma.vendorProfile.create.mockResolvedValue({ id: 'vp1' });

      const result = await service.register(
        'vendor@test.com',
        'password123',
        'Vendor Name',
        UserRole.VENDOR,
      );

      expect(result.user.role).toBe(UserRole.VENDOR);
      expect(prisma.vendorProfile.create).toHaveBeenCalledWith({
        data: {
          userId: 'u2',
          displayName: 'Vendor Name',
          status: 'PENDING',
        },
      });
    });

    it('rejects ADMIN self-registration', async () => {
      const { service } = buildService();
      await expect(
        service.register('admin@test.com', 'pass', 'Admin', UserRole.ADMIN),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate email', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register('dup@test.com', 'pass'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('normalizes email to lowercase', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u3',
        email: 'upper@test.com',
        role: UserRole.CUSTOMER,
        isEmailVerified: false,
        fullName: null,
      });

      await service.register('UPPER@TEST.COM', 'pass');
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'upper@test.com' },
      });
    });

    it('splits full name into firstName and lastName', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'u4',
        email: 'name@test.com',
        role: UserRole.CUSTOMER,
        isEmailVerified: false,
        fullName: 'Jane Marie Doe',
      });

      const result = await service.register(
        'name@test.com',
        'pass',
        'Jane Marie Doe',
      );

      expect(result.user.firstName).toBe('Jane');
      expect(result.user.lastName).toBe('Marie Doe');
    });
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        passwordHash: 'hashed',
        role: UserRole.CUSTOMER,
        isEmailVerified: true,
        fullName: 'User',
      });
      prisma.refreshToken.create.mockResolvedValue({ id: 'rt1' });

      const result = await service.login('user@test.com', 'password123');

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('user@test.com');
    });

    it('rejects non-existent email', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('nobody@test.com', 'pass'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects wrong password', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        passwordHash: 'hashed',
        role: UserRole.CUSTOMER,
      });
      verifyPassword.mockResolvedValueOnce(false);

      await expect(
        service.login('user@test.com', 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('me', () => {
    it('returns safe user fields', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        role: UserRole.CUSTOMER,
        isEmailVerified: true,
        fullName: 'John Doe',
      });

      const result = await service.me('u1');

      expect(result.user.id).toBe('u1');
      expect(result.user.firstName).toBe('John');
      expect(result.user.lastName).toBe('Doe');
    });

    it('throws NotFoundException for missing user', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.me('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('returns ok=true even for non-existent emails (account enumeration protection)', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset('nobody@test.com');
      expect(result.ok).toBe(true);
    });

    it('creates reset token and queues email without returning token', async () => {
      const { service, prisma, notifications } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.passwordResetToken.create.mockResolvedValue({
        id: 'prt1',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      });

      const result = await service.requestPasswordReset('user@test.com');

      expect(result.ok).toBe(true);
      expect('resetToken' in result).toBe(false);
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
      expect(notifications.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PASSWORD_RESET_REQUESTED',
          entityType: 'password_reset_token',
          entityId: 'prt1',
          recipientUserId: 'u1',
        }),
      );
    });

    it('stores both tokenHash and tokenLookupHash', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.passwordResetToken.create.mockResolvedValue({
        id: 'prt1',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      });

      await service.requestPasswordReset('user@test.com');

      const createCall = prisma.passwordResetToken.create.mock.calls[0][0];
      expect(createCall.data).toMatchObject({
        userId: 'u1',
        tokenHash: 'bcrypt_hashed_token',
        tokenLookupHash: 'sha256_lookup_hash',
      });
    });

    it('email payload includes ttlMinutes matching PASSWORD_RESET_EXPIRE_MINUTES', async () => {
      const { service, prisma, notifications } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.passwordResetToken.create.mockResolvedValue({
        id: 'prt1',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      });

      await service.requestPasswordReset('user@test.com');

      const emitCall = notifications.emit.mock.calls[0][0];
      expect(emitCall.payload.ttlMinutes).toBe(30);
    });

    it('reset URL is built from APP_ORIGIN without localhost in non-production', async () => {
      process.env.APP_ORIGIN = 'http://localhost:3000';
      const { service, prisma, notifications } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.passwordResetToken.create.mockResolvedValue({
        id: 'prt1',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      });

      await service.requestPasswordReset('user@test.com');

      const emitCall = notifications.emit.mock.calls[0][0];
      expect(emitCall.payload.resetUrl).toMatch(
        /^http:\/\/localhost:3000\/reset-password\?token=/,
      );
    });

    it('reset URL uses APP_ORIGIN when set to production origin', async () => {
      process.env.APP_ORIGIN = 'https://www.rentpropertyuae.com';
      const { service, prisma, notifications } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.passwordResetToken.create.mockResolvedValue({
        id: 'prt1',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      });

      await service.requestPasswordReset('user@test.com');

      const emitCall = notifications.emit.mock.calls[0][0];
      expect(emitCall.payload.resetUrl).toMatch(
        /^https:\/\/www\.rentpropertyuae\.com\/reset-password\?token=/,
      );
    });

    it('trailing slash in APP_ORIGIN does not produce double-slash in URL', async () => {
      process.env.APP_ORIGIN = 'https://www.rentpropertyuae.com/';
      const { service, prisma, notifications } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.passwordResetToken.create.mockResolvedValue({
        id: 'prt1',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      });

      await service.requestPasswordReset('user@test.com');

      const emitCall = notifications.emit.mock.calls[0][0];
      expect(emitCall.payload.resetUrl).not.toContain('//reset-password');
      expect(emitCall.payload.resetUrl).toMatch(
        /^https:\/\/www\.rentpropertyuae\.com\/reset-password\?token=/,
      );
    });
  });

  describe('resetPassword', () => {
    const FUTURE = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    it('succeeds with valid token found via deterministic lookup hash', async () => {
      const { service, prisma } = buildService();
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt1',
        userId: 'u1',
        usedAt: null,
        expiresAt: FUTURE,
        tokenLookupHash: 'sha256_lookup_hash',
      });

      const result = await service.resetPassword('valid-token', 'NewPassword1!');
      expect(result.ok).toBe(true);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('rejects expired token found via deterministic lookup', async () => {
      const { service, prisma } = buildService();
      const PAST = new Date(Date.now() - 1000);
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt1',
        userId: 'u1',
        usedAt: null,
        expiresAt: PAST,
        tokenLookupHash: 'sha256_lookup_hash',
      });

      await expect(
        service.resetPassword('expired-token', 'NewPassword1!'),
      ).rejects.toThrow('Invalid or expired reset link');
    });

    it('rejects already-used token found via deterministic lookup', async () => {
      const { service, prisma } = buildService();
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt1',
        userId: 'u1',
        usedAt: new Date(), // already used
        expiresAt: FUTURE,
        tokenLookupHash: 'sha256_lookup_hash',
      });

      await expect(
        service.resetPassword('used-token', 'NewPassword1!'),
      ).rejects.toThrow('Invalid or expired reset link');
    });

    it('rejects completely invalid token (not in DB)', async () => {
      const { service, prisma } = buildService();
      // Fast path finds nothing
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      // Legacy scan finds nothing either
      prisma.passwordResetToken.findMany.mockResolvedValue([]);

      await expect(
        service.resetPassword('garbage-token', 'NewPassword1!'),
      ).rejects.toThrow('Invalid or expired reset link');
    });

    it('falls back to bcrypt scan for legacy tokens (tokenLookupHash=null)', async () => {
      const { service, prisma } = buildService();
      // Fast lookup misses (no record for this lookup hash)
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);
      // Legacy scan returns a matching candidate
      prisma.passwordResetToken.findMany.mockResolvedValue([
        {
          id: 'prt_legacy',
          userId: 'u1',
          tokenHash: 'bcrypt_hashed_token',
          usedAt: null,
          expiresAt: FUTURE,
          tokenLookupHash: null,
        },
      ]);
      verifyToken.mockResolvedValueOnce(true);

      const result = await service.resetPassword('legacy-token', 'NewPassword1!');
      expect(result.ok).toBe(true);
    });

    it('invalidates all other active tokens for the same user on success', async () => {
      const { service, prisma } = buildService();
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt1',
        userId: 'u1',
        usedAt: null,
        expiresAt: FUTURE,
        tokenLookupHash: 'sha256_lookup_hash',
      });

      await service.resetPassword('valid-token', 'NewPassword1!');

      // updateMany call for other tokens should be present
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'u1',
            usedAt: null,
            id: { not: 'prt1' },
          }),
        }),
      );
    });

    it('revokes all active refresh tokens for the user on success', async () => {
      const { service, prisma } = buildService();
      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'prt1',
        userId: 'u1',
        usedAt: null,
        expiresAt: FUTURE,
        tokenLookupHash: 'sha256_lookup_hash',
      });

      await service.resetPassword('valid-token', 'NewPassword1!');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'u1', revokedAt: null },
        }),
      );
    });
  });
});
