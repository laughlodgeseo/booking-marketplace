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
  hashToken: jest.fn().mockResolvedValue('hashed_token'),
  verifyToken: jest.fn().mockResolvedValue(true),
}));

const { verifyPassword } = require('../common/security/password');

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
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
  };

  const jwt = {
    signAsync: jest.fn().mockResolvedValue('mock_jwt_token'),
  };

  const service = new AuthService(prisma as never, jwt as never);
  return { service, prisma, jwt };
}

describe('AuthService', () => {
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
      const { service, prisma, jwt } = buildService();
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
    it('returns ok=true even for non-existent emails', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.requestPasswordReset('nobody@test.com');
      expect(result.ok).toBe(true);
    });

    it('creates reset token for existing user', async () => {
      const { service, prisma } = buildService();
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.passwordResetToken.create.mockResolvedValue({ id: 'prt1' });

      const result = await service.requestPasswordReset('user@test.com');

      expect(result.ok).toBe(true);
      expect(result.resetToken).toBeDefined();
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    });
  });
});
