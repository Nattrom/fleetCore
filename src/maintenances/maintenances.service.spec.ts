import { ConflictException, ForbiddenException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import {
  MaintenanceStatus,
  MaintenanceType,
  UserRole,
  VehicleStatus,
} from '../common/enums/index.js';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Workshop } from '../workshops/entities/workshop.entity.js';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { Maintenance } from './entities/maintenance.entity.js';
import { MaintenancesService } from './maintenances.service.js';

const admin: AuthenticatedUser = {
  id: 'admin-id',
  name: 'Admin',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
  mechanicId: null,
};

function harness(
  overrides: {
    vehicle?: Partial<Vehicle> | null;
    mechanic?: Partial<Mechanic> | null;
    workshop?: Partial<Workshop> | null;
    maintenance?: Partial<Maintenance> | null;
    vehicleActive?: boolean;
    overlap?: boolean;
    otherActive?: boolean;
  } = {},
) {
  const vehicle = {
    id: 'vehicle-id',
    mileage: 100,
    status: VehicleStatus.AVAILABLE,
    ...overrides.vehicle,
  } as Vehicle;
  const mechanic = {
    id: 'mechanic-id',
    isActive: true,
    ...overrides.mechanic,
  } as Mechanic;
  const workshop = {
    id: 'workshop-id',
    isActive: true,
    ...overrides.workshop,
  } as Workshop;
  const maintenance = {
    id: 'maintenance-id',
    vehicleId: vehicle.id,
    mechanicId: mechanic.id,
    workshopId: workshop.id,
    mileage: 100,
    status: MaintenanceStatus.SCHEDULED,
    ...overrides.maintenance,
  } as Maintenance;

  const intervalQuery = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getExists: jest.fn().mockResolvedValue(overrides.overlap ?? false),
  };
  const vehicleRepository = {
    findOne: jest.fn().mockResolvedValue(vehicle),
    save: jest.fn().mockImplementation(async (value) => value),
    exists: jest.fn().mockResolvedValue(true),
  };
  const mechanicRepository = {
    findOne: jest.fn().mockResolvedValue(mechanic),
    exists: jest.fn().mockResolvedValue(true),
  };
  const workshopRepository = {
    findOne: jest.fn().mockResolvedValue(workshop),
    exists: jest.fn().mockResolvedValue(true),
  };
  const userRepository = {
    findOne: jest.fn().mockResolvedValue({
      id: 'technician-user-id',
      role: UserRole.TECHNICIAN,
      isActive: true,
    }),
  };
  const maintenanceRepository = {
    findOne: jest.fn().mockResolvedValue(maintenance),
    exists: jest.fn().mockResolvedValue(overrides.otherActive ?? false),
    create: jest.fn((value) => value),
    save: jest.fn().mockImplementation(async (value) => value),
    createQueryBuilder: jest.fn().mockReturnValue(intervalQuery),
  };
  const repositories = new Map<unknown, unknown>([
    [Vehicle, vehicleRepository],
    [Mechanic, mechanicRepository],
    [Workshop, workshopRepository],
    [User, userRepository],
    [Maintenance, maintenanceRepository],
  ]);
  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  };
  const dataSource = {
    transaction: jest.fn(async (callback: (manager: unknown) => unknown) =>
      callback(manager),
    ),
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const rootRepository = {
    findOne: jest.fn().mockResolvedValue(maintenance),
  };
  const service = new MaintenancesService(
    rootRepository as unknown as Repository<Maintenance>,
    dataSource as unknown as DataSource,
    audit as unknown as AuditService,
  );
  const dto: CreateMaintenanceDto = {
    vehicleId: 'vehicle-id',
    mechanicId: 'mechanic-id',
    workshopId: 'workshop-id',
    type: MaintenanceType.PREVENTIVE,
    description: 'Oil change',
    mileage: 100,
    scheduledAt: '2026-11-01T10:00:00.000Z',
    scheduledEndAt: '2026-11-01T11:00:00.000Z',
  };

  return {
    service,
    manager,
    dataSource,
    audit,
    vehicle,
    maintenance,
    vehicleRepository,
    mechanicRepository,
    workshopRepository,
    userRepository,
    maintenanceRepository,
    intervalQuery,
    dto,
  };
}

describe('MaintenancesService', () => {
  it('creates a scheduled maintenance after checking all linked resources', async () => {
    const h = harness();
    const created = await h.service.create(h.dto, admin);
    expect(created.status).toBe(MaintenanceStatus.SCHEDULED);
    expect(h.intervalQuery.andWhere).toHaveBeenCalledTimes(3);
    expect(h.audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CREATE_AND_ASSIGN' }),
      h.manager,
    );
  });

  it('rejects invalid date order before opening a transaction', async () => {
    const h = harness();
    await expect(
      h.service.create({ ...h.dto, scheduledEndAt: h.dto.scheduledAt }, admin),
    ).rejects.toThrow('La fecha de fin debe ser posterior al inicio');
    expect(h.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejects inactive vehicles and active vehicle duplicates', async () => {
    const inactive = harness({ vehicle: { status: VehicleStatus.INACTIVE } });
    await expect(
      inactive.service.create(inactive.dto, admin),
    ).rejects.toBeInstanceOf(ConflictException);

    const duplicate = harness();
    duplicate.maintenanceRepository.exists.mockResolvedValue(true);
    await expect(
      duplicate.service.create(duplicate.dto, admin),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects inactive mechanics, workshops, and decreasing odometer readings', async () => {
    const inactiveMechanic = harness({ mechanic: { isActive: false } });
    await expect(
      inactiveMechanic.service.create(inactiveMechanic.dto, admin),
    ).rejects.toBeInstanceOf(ConflictException);

    const inactiveWorkshop = harness({ workshop: { isActive: false } });
    await expect(
      inactiveWorkshop.service.create(inactiveWorkshop.dto, admin),
    ).rejects.toBeInstanceOf(ConflictException);

    const regressedMileage = harness();
    await expect(
      regressedMileage.service.create(
        { ...regressedMileage.dto, mileage: 99 },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects overlapping mechanic assignments', async () => {
    const h = harness({ overlap: true });
    await expect(h.service.create(h.dto, admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(h.intervalQuery.getExists).toHaveBeenCalled();
  });

  it('rejects assignments to mechanics linked to inactive user accounts', async () => {
    const h = harness({ mechanic: { userId: 'technician-user-id' } });
    h.userRepository.findOne.mockResolvedValue(null);
    await expect(h.service.create(h.dto, admin)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('moves a scheduled vehicle to maintenance and restores it on cancellation', async () => {
    const h = harness();
    const started = await h.service.updateStatus(
      'maintenance-id',
      { status: MaintenanceStatus.IN_PROGRESS },
      admin,
    );
    expect(started.status).toBe(MaintenanceStatus.IN_PROGRESS);
    expect(h.vehicle.status).toBe(VehicleStatus.IN_MAINTENANCE);

    h.maintenance.status = MaintenanceStatus.SCHEDULED;
    h.vehicle.status = VehicleStatus.AVAILABLE;
    h.maintenanceRepository.exists.mockResolvedValue(false);
    const cancelled = await h.service.cancel('maintenance-id', admin);
    expect(cancelled.status).toBe(MaintenanceStatus.CANCELLED);
    expect(h.vehicle.status).toBe(VehicleStatus.AVAILABLE);
  });

  it('completes maintenance, updates vehicle mileage, and preserves inactive status', async () => {
    const h = harness({
      vehicle: { status: VehicleStatus.IN_MAINTENANCE },
      maintenance: { status: MaintenanceStatus.IN_PROGRESS },
    });
    const completion: CompleteMaintenanceDto = {
      workPerformed: 'Replaced oil filter',
      cost: '250.00',
      finishedAt: '2026-11-01T11:00:00.000Z',
      finalMileage: 150,
    };

    const result = await h.service.complete(
      'maintenance-id',
      completion,
      admin,
    );
    expect(result.status).toBe(MaintenanceStatus.COMPLETED);
    expect(result.finalMileage).toBe(150);
    expect(h.vehicle.mileage).toBe(150);
    expect(h.vehicle.status).toBe(VehicleStatus.AVAILABLE);

    h.vehicle.status = VehicleStatus.INACTIVE;
    await h.service
      .complete('maintenance-id', completion, admin)
      .catch(() => undefined);
    expect(h.vehicle.status).toBe(VehicleStatus.INACTIVE);
  });

  it('rejects technician access to maintenance assigned to another mechanic', async () => {
    const h = harness({
      maintenance: { mechanicId: 'different-mechanic' },
    });
    const technician: AuthenticatedUser = {
      ...admin,
      id: 'tech-id',
      role: UserRole.TECHNICIAN,
      mechanicId: 'tech-mechanic-id',
    };
    await expect(
      h.service.get('maintenance-id', technician),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
