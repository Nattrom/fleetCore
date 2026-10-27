import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { Workshop } from './entities/workshop.entity.js';
import { WorkshopsService } from './workshops.service.js';

describe('WorkshopsService', () => {
  it('creates normalized workshop details and records the operation', async () => {
    const workshop = {
      id: 'workshop-id',
      name: 'Central Workshop',
      address: '100 Fleet Road',
      isActive: true,
    };
    const repository = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue(workshop),
    };
    const audit = { record: jest.fn() };
    const service = new WorkshopsService(
      repository as unknown as Repository<Workshop>,
      {} as DataSource,
      audit as unknown as AuditService,
    );

    await service.create(
      { name: ' Central Workshop ', address: ' 100 Fleet Road ' },
      'admin-id',
    );

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Central Workshop',
      address: '100 Fleet Road',
      isActive: true,
    });
    expect(audit.record).toHaveBeenCalled();
  });

  it('does not inactivate a workshop with active maintenance', async () => {
    const workshop = { id: 'workshop-id', isActive: true };
    const workshopRepository = {
      findOne: jest.fn().mockResolvedValue(workshop),
      save: jest.fn(),
    };
    const maintenanceRepository = {
      exists: jest.fn().mockResolvedValue(true),
    };
    const manager = {
      getRepository: (entity: unknown) =>
        entity === Workshop ? workshopRepository : maintenanceRepository,
    };
    const dataSource = {
      transaction: (callback: (manager: unknown) => unknown) =>
        callback(manager),
    };
    const service = new WorkshopsService(
      {} as Repository<Workshop>,
      dataSource as unknown as DataSource,
      { record: jest.fn() } as unknown as AuditService,
    );

    await expect(
      service.setActive('workshop-id', false, 'admin-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(workshopRepository.save).not.toHaveBeenCalled();
  });
});
