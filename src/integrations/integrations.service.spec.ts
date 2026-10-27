import { NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { IntegrationsService } from './integrations.service.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { VehicleStatus } from '../common/enums/index.js';

describe('IntegrationsService', () => {
  const query = Object.assign(new PaginationQueryDto(), { page: 1, limit: 10 });

  it('returns a limited public vehicle and maintenance history projection', async () => {
    const vehicle = {
      id: 'vehicle-id',
      plate: 'ABC123',
      brand: 'Volvo',
      model: 'FH',
      status: VehicleStatus.AVAILABLE,
    };
    const maintenance = {
      id: 'maintenance-id',
      type: 'PREVENTIVE',
      status: 'COMPLETED',
      description: 'Inspection',
      mileage: 100,
      cost: '250.00',
      finishedAt: new Date('2026-01-01T00:00:00.000Z'),
      mechanic: { name: 'Jamie' },
      workshop: { name: 'Central' },
      passwordHash: 'must-not-be-selected',
    };
    const vehicles = { findOne: jest.fn().mockResolvedValue(vehicle) };
    const maintenances = {
      findAndCount: jest.fn().mockResolvedValue([[maintenance], 1]),
    };
    const service = new IntegrationsService(
      vehicles as never,
      maintenances as never,
    );

    const result = await service.vehicleHistory('vehicle-id', query);

    expect(result.vehicle).toEqual({
      id: 'vehicle-id',
      plate: 'ABC123',
      brand: 'Volvo',
      model: 'FH',
      availability: VehicleStatus.AVAILABLE,
    });
    expect(result.history.items[0]).not.toHaveProperty('passwordHash');
    expect(maintenances.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { vehicleId: 'vehicle-id' },
        take: 10,
        skip: 0,
      }),
    );
  });

  it('reports an unknown vehicle', async () => {
    const service = new IntegrationsService(
      { findOne: jest.fn().mockResolvedValue(null) } as never,
      {} as never,
    );
    await expect(
      service.vehicleHistory('missing', query),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
