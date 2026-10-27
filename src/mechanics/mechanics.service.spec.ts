import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { UserRole } from '../common/enums/index.js';
import { User } from '../users/entities/user.entity.js';
import { Mechanic } from './entities/mechanic.entity.js';
import { MechanicsService } from './mechanics.service.js';

describe('MechanicsService', () => {
  it('only links active technician users', async () => {
    const mechanics = {
      create: jest.fn((data) => data),
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
    };
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-id',
        role: UserRole.ADMIN,
        isActive: true,
      }),
    };
    const audit = { record: jest.fn() };
    const dataSource = {} as DataSource;
    const service = new MechanicsService(
      mechanics as unknown as Repository<Mechanic>,
      users as unknown as Repository<User>,
      dataSource,
      audit as unknown as AuditService,
    );

    await expect(
      service.create(
        {
          name: 'Jamie Rivera',
          email: 'jamie@example.com',
          specialty: 'Diesel',
          userId: 'user-id',
        },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mechanics.save).not.toHaveBeenCalled();
  });

  it('rejects linking one user to multiple mechanics', async () => {
    const mechanics = {
      create: jest.fn((data) => data),
      findOne: jest.fn().mockResolvedValue({ id: 'already-linked' }),
      save: jest.fn(),
    };
    const users = {
      findOne: jest.fn().mockResolvedValue({
        id: 'user-id',
        role: UserRole.TECHNICIAN,
        isActive: true,
      }),
    };
    const service = new MechanicsService(
      mechanics as unknown as Repository<Mechanic>,
      users as unknown as Repository<User>,
      {} as DataSource,
      { record: jest.fn() } as unknown as AuditService,
    );

    await expect(
      service.create(
        {
          name: 'Jamie Rivera',
          email: 'jamie@example.com',
          specialty: 'Diesel',
          userId: 'user-id',
        },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
