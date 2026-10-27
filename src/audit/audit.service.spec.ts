import { jest } from '@jest/globals';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';
import { AuditService } from './audit.service.js';

describe('AuditService', () => {
  it('persists sanitized audit metadata using the provided transaction manager', async () => {
    const repository = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const manager = {
      getRepository: jest.fn().mockReturnValue(repository),
    };
    const service = new AuditService({} as Repository<AuditLog>);

    await service.record(
      {
        userId: 'actor-id',
        action: 'UPDATE',
        entity: 'Vehicle',
        entityId: 'vehicle-id',
        details: { fields: 'mileage' },
        userAgent: 'x'.repeat(600),
      },
      manager as unknown as EntityManager,
    );

    expect(manager.getRepository).toHaveBeenCalledWith(AuditLog);
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'actor-id',
        action: 'UPDATE',
        entityId: 'vehicle-id',
        userAgent: 'x'.repeat(500),
      }),
    );
  });

  it('uses the injected repository when no transaction is supplied', async () => {
    const repository = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuditService(
      repository as unknown as Repository<AuditLog>,
    );
    await service.record({ action: 'LOGIN', entity: 'User' });
    expect(repository.save).toHaveBeenCalled();
  });
});
