import { ConflictException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { MaintenanceStatus, VehicleStatus } from '../common/enums/index.js';
import { Vehicle } from './entities/vehicle.entity.js';
import { VehiclesService } from './vehicles.service.js';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let vehicleRepository: Record<string, jest.Mock>;
  let transactionalVehicles: Record<string, jest.Mock>;
  let maintenances: Record<string, jest.Mock>;
  let audit: Record<string, jest.Mock>;

  beforeEach(() => {
    vehicleRepository = {
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn(),
    };
    transactionalVehicles = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    maintenances = { exists: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    const manager = {
      getRepository: (entity: unknown) =>
        entity === Vehicle ? transactionalVehicles : maintenances,
    };
    const dataSource = {
      transaction: (callback: (manager: unknown) => unknown) =>
        callback(manager),
    };
    service = new VehiclesService(
      vehicleRepository as unknown as Repository<Vehicle>,
      dataSource as unknown as DataSource,
      audit as unknown as AuditService,
    );
  });

  it('paginates vehicle lists', async () => {
    vehicleRepository.findAndCount.mockResolvedValue([
      [{ id: 'vehicle-1' }],
      1,
    ]);
    await expect(service.list({ page: 2, limit: 5 })).resolves.toMatchObject({
      items: [{ id: 'vehicle-1' }],
      pagination: { page: 2, limit: 5, total: 1, totalPages: 1 },
    });
  });

  it('normalizes plates and forces initial availability on creation', async () => {
    vehicleRepository.findOne.mockResolvedValue(null);
    vehicleRepository.save.mockResolvedValue({
      id: 'vehicle-1',
      plate: 'ABC123',
      status: VehicleStatus.AVAILABLE,
    });

    await service.create(
      {
        plate: ' abc123 ',
        brand: ' Volvo ',
        model: ' FH ',
        year: 2022,
        mileage: 10,
      },
      'admin-id',
    );

    expect(vehicleRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        plate: 'ABC123',
        brand: 'Volvo',
        model: 'FH',
        status: VehicleStatus.AVAILABLE,
      }),
    );
    expect(audit.record).toHaveBeenCalled();
  });

  it('rejects duplicate plates', async () => {
    vehicleRepository.findOne.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create(
        {
          plate: 'ABC123',
          brand: 'Volvo',
          model: 'FH',
          year: 2022,
          mileage: 0,
        },
        'admin-id',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects mileage regression', async () => {
    transactionalVehicles.findOne.mockResolvedValue({
      id: 'vehicle-1',
      mileage: 100,
    });
    await expect(
      service.update('vehicle-1', { mileage: 99 }, 'admin-id'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not inactivate a vehicle with an active maintenance', async () => {
    transactionalVehicles.findOne.mockResolvedValue({
      id: 'vehicle-1',
      status: VehicleStatus.AVAILABLE,
    });
    maintenances.exists.mockResolvedValue(true);

    await expect(
      service.deactivate('vehicle-1', 'admin-id'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(maintenances.exists).toHaveBeenCalledWith({
      where: {
        vehicleId: 'vehicle-1',
        status: expect.objectContaining({
          _value: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
        }),
      },
    });
  });
});
