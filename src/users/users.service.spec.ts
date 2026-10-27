import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import * as argon2 from 'argon2';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { UserRole } from '../common/enums/index.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let users: Record<string, jest.Mock>;
  let transactionUsers: Record<string, jest.Mock>;
  let audit: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;

  beforeEach(() => {
    users = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
    };
    transactionUsers = {
      findOne: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    manager = {
      query: jest.fn(),
      getRepository: jest.fn().mockReturnValue(transactionUsers),
    };
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    service = new UsersService(
      users as unknown as Repository<User>,
      dataSource as unknown as DataSource,
      audit as unknown as AuditService,
    );
  });

  it('normalizes email lookups', async () => {
    users.findOne.mockResolvedValue(null);
    await service.findByEmail(' Example@Example.com ');
    expect(users.findOne).toHaveBeenCalledWith({
      where: { email: 'example@example.com' },
    });
  });

  it('lists only public user fields', async () => {
    users.findAndCount.mockResolvedValue([[{ id: 'user-id' }], 1]);
    await service.list({ page: 1, limit: 10 });
    expect(users.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.not.objectContaining({ passwordHash: true }),
      }),
    );
  });

  it('hashes an admin-created user password and records the action', async () => {
    users.findOne.mockResolvedValue(null);
    users.save.mockImplementation(async (value) => ({
      ...value,
      id: 'new-user-id',
      createdAt: new Date(),
    }));

    const result = await service.createByAdmin(
      {
        name: ' New User ',
        email: ' New@Example.com ',
        password: 'a-strong-password',
        role: UserRole.MANAGER,
      },
      'admin-id',
    );

    const saved = users.save.mock.calls[0][0] as User;
    expect(saved.name).toBe('New User');
    expect(saved.email).toBe('new@example.com');
    expect(await argon2.verify(saved.passwordHash, 'a-strong-password')).toBe(
      true,
    );
    expect(result).not.toHaveProperty('passwordHash');
    expect(audit.record).toHaveBeenCalled();
  });

  it('rejects duplicate admin-created accounts', async () => {
    users.findOne.mockResolvedValue({ id: 'existing-id' });
    await expect(
      service.createByAdmin(
        {
          name: 'New User',
          email: 'new@example.com',
          password: 'a-strong-password',
          role: UserRole.TECHNICIAN,
        },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('prevents an administrator from disabling their own account', async () => {
    await expect(
      service.setActive('admin-id', false, 'admin-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });

  it('protects the last active administrator', async () => {
    transactionUsers.findOne.mockResolvedValue({
      id: 'last-admin',
      role: UserRole.ADMIN,
      isActive: true,
    });
    transactionUsers.count.mockResolvedValue(1);

    await expect(
      service.setActive('last-admin', false, 'another-admin'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transactionUsers.save).not.toHaveBeenCalled();
  });

  it('deactivates another account with an audit record in the transaction', async () => {
    transactionUsers.findOne.mockResolvedValue({
      id: 'user-id',
      role: UserRole.TECHNICIAN,
      isActive: true,
    });
    transactionUsers.save.mockImplementation(async (user) => user);

    await expect(
      service.setActive('user-id', false, 'admin-id'),
    ).resolves.toMatchObject({ isActive: false });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DEACTIVATE', entityId: 'user-id' }),
      manager,
    );
  });

  it('reports an unknown account when changing its status', async () => {
    transactionUsers.findOne.mockResolvedValue(null);
    await expect(
      service.setActive('missing', true, 'admin-id'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
