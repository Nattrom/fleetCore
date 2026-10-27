import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service.js';
import { PasswordHasherService } from '../common/security/password-hasher.service.js';
import { UserRole } from '../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<
    Pick<UsersService, 'findByEmail' | 'create' | 'updatePasswordHash'>
  >;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let audit: jest.Mocked<Pick<AuditService, 'record'>>;
  let passwords: PasswordHasherService;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      updatePasswordHash: jest.fn(),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    passwords = new PasswordHasherService();
    service = new AuthService(
      users as UsersService,
      jwt as JwtService,
      { getOrThrow: jest.fn().mockReturnValue('1h') } as never,
      audit as AuditService,
      passwords,
    );
  });

  it('registers a normalized user with a password hash and a non-admin role', async () => {
    users.findByEmail.mockResolvedValue(null);
    users.create.mockImplementation(async (values) => values as User);

    const result = await service.register({
      name: ' Alex Morgan ',
      email: ' Alex@Example.com ',
      password: 'a-strong-password',
    });

    const created = users.create.mock.calls[0][0];
    expect(created.email).toBe('alex@example.com');
    expect(created.name).toBe('Alex Morgan');
    expect(created.passwordHash).not.toBe('a-strong-password');
    expect(
      await bcrypt.compare('a-strong-password', created.passwordHash!),
    ).toBe(true);
    expect(created.role).toBe(UserRole.TECHNICIAN);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects duplicate email addresses', async () => {
    users.findByEmail.mockResolvedValue({ id: 'existing' } as User);

    await expect(
      service.register({
        name: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'a-strong-password',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(users.create).not.toHaveBeenCalled();
  });

  it('issues a token for a valid bcrypt password without returning its hash', async () => {
    const passwordHash = await bcrypt.hash('a-strong-password', 4);
    users.findByEmail.mockResolvedValue({
      id: 'user-id',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      passwordHash,
      role: UserRole.TECHNICIAN,
      isActive: true,
    } as User);

    const result = await service.login({
      email: 'alex@example.com',
      password: 'a-strong-password',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.user.role).toBe(UserRole.TECHNICIAN);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(users.updatePasswordHash).not.toHaveBeenCalled();
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'user-id' },
      { expiresIn: '1h' },
    );
  });

  it('upgrades a valid legacy Argon2 password to bcrypt during login', async () => {
    const passwordHash = await argon2.hash('a-strong-password');
    users.findByEmail.mockResolvedValue({
      id: 'legacy-user',
      name: 'Legacy User',
      email: 'legacy@example.com',
      passwordHash,
      role: UserRole.TECHNICIAN,
      isActive: true,
    } as User);

    await service.login({
      email: 'legacy@example.com',
      password: 'a-strong-password',
    });

    const [, upgradedHash] = users.updatePasswordHash.mock.calls[0];
    expect(upgradedHash.startsWith('$2')).toBe(true);
    expect(await bcrypt.compare('a-strong-password', upgradedHash)).toBe(true);
  });

  it('rejects inactive users and invalid passwords', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'user-id',
      passwordHash: await bcrypt.hash('a-strong-password', 4),
      isActive: false,
    } as User);

    await expect(
      service.login({
        email: 'alex@example.com',
        password: 'a-strong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password for an active account', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'user-id',
      passwordHash: await bcrypt.hash('correct-password', 4),
      isActive: true,
    } as User);

    await expect(
      service.login({
        email: 'alex@example.com',
        password: 'incorrect-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(users.updatePasswordHash).not.toHaveBeenCalled();
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('returns the authenticated user profile without credentials', () => {
    expect(
      service.profile({
        id: 'user-id',
        name: 'Alex Morgan',
        email: 'alex@example.com',
        role: UserRole.TECHNICIAN,
      }),
    ).toEqual({
      id: 'user-id',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      role: UserRole.TECHNICIAN,
    });
  });
});
