import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { jest } from '@jest/globals';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service.js';
import { UserRole } from '../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'findByEmail' | 'create'>>;
  let jwt: jest.Mocked<Pick<JwtService, 'signAsync'>>;
  let audit: jest.Mocked<Pick<AuditService, 'record'>>;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(
      users as UsersService,
      jwt as JwtService,
      { getOrThrow: jest.fn().mockReturnValue('1h') } as never,
      audit as AuditService,
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
      await argon2.verify(created.passwordHash!, 'a-strong-password'),
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

  it('issues a token for a valid password without returning the password hash', async () => {
    const passwordHash = await argon2.hash('a-strong-password');
    users.findByEmail.mockResolvedValue({
      id: 'user-id',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      passwordHash,
      role: UserRole.MANAGER,
      isActive: true,
    } as User);

    const result = await service.login({
      email: 'alex@example.com',
      password: 'a-strong-password',
    });

    expect(result.accessToken).toBe('signed-token');
    expect(result.user.role).toBe(UserRole.MANAGER);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(jwt.signAsync).toHaveBeenCalledWith(
      { sub: 'user-id' },
      { expiresIn: '1h' },
    );
  });

  it('rejects inactive users and invalid passwords', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'user-id',
      passwordHash: await argon2.hash('a-strong-password'),
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

  it('returns the authenticated user profile without credentials', () => {
    expect(
      service.profile({
        id: 'user-id',
        name: 'Alex Morgan',
        email: 'alex@example.com',
        role: UserRole.MANAGER,
      }),
    ).toEqual({
      id: 'user-id',
      name: 'Alex Morgan',
      email: 'alex@example.com',
      role: UserRole.MANAGER,
    });
  });
});
