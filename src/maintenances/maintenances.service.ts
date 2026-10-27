import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import {
  PaginationQueryDto,
  paginated,
} from '../common/dto/pagination-query.dto.js';
import {
  MaintenanceStatus,
  UserRole,
  VehicleStatus,
} from '../common/enums/index.js';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { User } from '../users/entities/user.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Workshop } from '../workshops/entities/workshop.entity.js';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { ListMaintenancesDto } from './dto/list-maintenances.dto.js';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto.js';
import { assertMaintenanceTransition } from './maintenance-state.js';
import { Maintenance } from './entities/maintenance.entity.js';

@Injectable()
export class MaintenancesService {
  constructor(
    @InjectRepository(Maintenance)
    private readonly maintenances: Repository<Maintenance>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async create(
    dto: CreateMaintenanceDto,
    actor: AuthenticatedUser,
  ): Promise<Maintenance> {
    const scheduledAt = new Date(dto.scheduledAt);
    const scheduledEndAt = new Date(dto.scheduledEndAt);
    if (
      Number.isNaN(scheduledAt.getTime()) ||
      Number.isNaN(scheduledEndAt.getTime()) ||
      scheduledEndAt <= scheduledAt
    ) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior al inicio',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const vehicle = await manager.getRepository(Vehicle).findOne({
        where: { id: dto.vehicleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
      if (vehicle.status === VehicleStatus.INACTIVE) {
        throw new ConflictException('No se puede asignar un vehículo inactivo');
      }
      if (vehicle.status === VehicleStatus.IN_MAINTENANCE) {
        throw new ConflictException('El vehículo ya está en mantenimiento');
      }

      const mechanic = await manager.getRepository(Mechanic).findOne({
        where: { id: dto.mechanicId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!mechanic) throw new NotFoundException('Mecánico no encontrado');
      if (!mechanic.isActive) {
        throw new ConflictException('No se puede asignar un mecánico inactivo');
      }
      if (mechanic.userId) {
        const mechanicUser = await manager.getRepository(User).findOne({
          where: {
            id: mechanic.userId,
            isActive: true,
            role: UserRole.TECHNICIAN,
          },
        });
        if (!mechanicUser) {
          throw new ConflictException(
            'La cuenta vinculada al mecánico no está activa',
          );
        }
      }

      const workshop = await manager.getRepository(Workshop).findOne({
        where: { id: dto.workshopId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!workshop) throw new NotFoundException('Taller no encontrado');
      if (!workshop.isActive) {
        throw new ConflictException('No se puede asignar un taller inactivo');
      }

      if (dto.mileage < vehicle.mileage) {
        throw new ConflictException(
          'El kilometraje de la intervención no puede ser menor al actual',
        );
      }

      const activeVehicleMaintenance = await manager
        .getRepository(Maintenance)
        .exists({
          where: {
            vehicleId: vehicle.id,
            status: In([
              MaintenanceStatus.SCHEDULED,
              MaintenanceStatus.IN_PROGRESS,
            ]),
          },
        });
      if (activeVehicleMaintenance) {
        throw new ConflictException(
          'El vehículo ya tiene un mantenimiento activo',
        );
      }

      const overlappingMechanicMaintenance = await manager
        .getRepository(Maintenance)
        .createQueryBuilder('maintenance')
        .where('maintenance.mechanicId = :mechanicId', {
          mechanicId: mechanic.id,
        })
        .andWhere('maintenance.status IN (:...statuses)', {
          statuses: [
            MaintenanceStatus.SCHEDULED,
            MaintenanceStatus.IN_PROGRESS,
          ],
        })
        .andWhere('maintenance.scheduledAt < :scheduledEndAt', {
          scheduledEndAt,
        })
        .andWhere('maintenance.scheduledEndAt > :scheduledAt', { scheduledAt })
        .getExists();
      if (overlappingMechanicMaintenance) {
        throw new ConflictException(
          'El mecánico ya tiene una asignación en ese horario',
        );
      }

      const maintenanceRepository = manager.getRepository(Maintenance);
      const maintenance = await maintenanceRepository.save(
        maintenanceRepository.create({
          vehicleId: vehicle.id,
          mechanicId: mechanic.id,
          workshopId: workshop.id,
          type: dto.type,
          description: dto.description.trim(),
          mileage: dto.mileage,
          scheduledAt,
          scheduledEndAt,
          status: MaintenanceStatus.SCHEDULED,
        }),
      );
      await this.audit.record(
        {
          userId: actor.id,
          action: 'CREATE_AND_ASSIGN',
          entity: 'Maintenance',
          entityId: maintenance.id,
          details: {
            vehicleId: vehicle.id,
            mechanicId: mechanic.id,
            workshopId: workshop.id,
            status: maintenance.status,
          },
        },
        manager,
      );
      return maintenance;
    });
  }

  async list(query: ListMaintenancesDto, actor: AuthenticatedUser) {
    const builder = this.listQuery(query, actor);
    if (!builder) return paginated([], query.page, query.limit, 0);
    if (query.status)
      builder.andWhere('maintenance.status = :status', {
        status: query.status,
      });
    if (query.vehicleId) {
      builder.andWhere('maintenance.vehicleId = :vehicleId', {
        vehicleId: query.vehicleId,
      });
    }
    if (query.mechanicId && actor.role !== UserRole.TECHNICIAN) {
      builder.andWhere('maintenance.mechanicId = :filterMechanicId', {
        filterMechanicId: query.mechanicId,
      });
    }
    const [items, total] = await builder.getManyAndCount();
    return paginated(items, query.page, query.limit, total);
  }

  async active(query: PaginationQueryDto, actor: AuthenticatedUser) {
    const builder = this.listQuery(query, actor);
    if (!builder) return paginated([], query.page, query.limit, 0);
    builder.andWhere('maintenance.status IN (:...activeStatuses)', {
      activeStatuses: [
        MaintenanceStatus.SCHEDULED,
        MaintenanceStatus.IN_PROGRESS,
      ],
    });
    const [items, total] = await builder.getManyAndCount();
    return paginated(items, query.page, query.limit, total);
  }

  async get(id: string, actor: AuthenticatedUser): Promise<Maintenance> {
    const maintenance = await this.maintenances.findOne({
      where: { id },
      relations: { vehicle: true, mechanic: true, workshop: true },
    });
    if (!maintenance)
      throw new NotFoundException('Mantenimiento no encontrado');
    this.assertCanAccess(maintenance, actor);
    return maintenance;
  }

  async myAssignments(query: PaginationQueryDto, actor: AuthenticatedUser) {
    if (!actor.mechanicId) return paginated([], query.page, query.limit, 0);
    const [items, total] = await this.maintenances.findAndCount({
      where: { mechanicId: actor.mechanicId },
      relations: { vehicle: true, workshop: true },
      order: { scheduledAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async forVehicle(id: string, query: PaginationQueryDto) {
    const exists = await this.dataSource
      .getRepository(Vehicle)
      .exists({ where: { id } });
    if (!exists) throw new NotFoundException('Vehículo no encontrado');
    const [items, total] = await this.maintenances.findAndCount({
      where: { vehicleId: id },
      relations: { mechanic: true, workshop: true },
      order: { scheduledAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async forMechanic(
    id: string,
    query: PaginationQueryDto,
    actor: AuthenticatedUser,
  ) {
    if (actor.role === UserRole.TECHNICIAN && actor.mechanicId !== id) {
      throw new ForbiddenException(
        'No puedes consultar los mantenimientos de otro mecánico',
      );
    }
    const exists = await this.dataSource
      .getRepository(Mechanic)
      .exists({ where: { id } });
    if (!exists) throw new NotFoundException('Mecánico no encontrado');
    const [items, total] = await this.maintenances.findAndCount({
      where: { mechanicId: id },
      relations: { vehicle: true, workshop: true },
      order: { scheduledAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async updateStatus(
    id: string,
    dto: UpdateMaintenanceStatusDto,
    actor: AuthenticatedUser,
  ): Promise<Maintenance> {
    return this.dataSource.transaction(async (manager) => {
      const maintenance = await this.lockMaintenance(manager, id);
      this.assertCanOperate(maintenance, actor);
      assertMaintenanceTransition(maintenance.status, dto.status);
      const previousStatus = maintenance.status;

      const vehicle = await manager.getRepository(Vehicle).findOne({
        where: { id: maintenance.vehicleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
      maintenance.status = dto.status;
      const saved = await manager.getRepository(Maintenance).save(maintenance);

      if (dto.status === MaintenanceStatus.IN_PROGRESS) {
        if (vehicle.status === VehicleStatus.INACTIVE) {
          throw new ConflictException(
            'No se puede iniciar mantenimiento de un vehículo inactivo',
          );
        }
        vehicle.status = VehicleStatus.IN_MAINTENANCE;
        await manager.getRepository(Vehicle).save(vehicle);
      } else {
        await this.restoreVehicleAvailability(manager, vehicle);
      }
      await this.audit.record(
        {
          userId: actor.id,
          action:
            dto.status === MaintenanceStatus.IN_PROGRESS ? 'START' : 'CANCEL',
          entity: 'Maintenance',
          entityId: id,
          details: { from: previousStatus, to: dto.status },
        },
        manager,
      );
      return saved;
    });
  }

  async complete(
    id: string,
    dto: CompleteMaintenanceDto,
    actor: AuthenticatedUser,
  ): Promise<Maintenance> {
    return this.dataSource.transaction(async (manager) => {
      const maintenance = await this.lockMaintenance(manager, id);
      this.assertCanOperate(maintenance, actor);
      assertMaintenanceTransition(
        maintenance.status,
        MaintenanceStatus.COMPLETED,
      );

      const vehicle = await manager.getRepository(Vehicle).findOne({
        where: { id: maintenance.vehicleId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
      const finalMileage = dto.finalMileage;
      if (
        finalMileage < maintenance.mileage ||
        finalMileage < vehicle.mileage
      ) {
        throw new ConflictException(
          'El kilometraje final no puede ser menor al registrado o al actual del vehículo',
        );
      }

      maintenance.workPerformed = dto.workPerformed.trim();
      if (!maintenance.workPerformed) {
        throw new BadRequestException('El trabajo realizado es obligatorio');
      }
      maintenance.cost = dto.cost;
      maintenance.finishedAt = new Date(dto.finishedAt);
      maintenance.finalMileage = finalMileage;
      maintenance.status = MaintenanceStatus.COMPLETED;
      vehicle.mileage = finalMileage;
      await manager.getRepository(Vehicle).save(vehicle);
      const saved = await manager.getRepository(Maintenance).save(maintenance);
      await this.restoreVehicleAvailability(manager, vehicle);
      await this.audit.record(
        {
          userId: actor.id,
          action: 'COMPLETE',
          entity: 'Maintenance',
          entityId: id,
          details: { finalMileage, cost: dto.cost },
        },
        manager,
      );
      return saved;
    });
  }

  async cancel(id: string, actor: AuthenticatedUser): Promise<Maintenance> {
    return this.updateStatus(
      id,
      { status: MaintenanceStatus.CANCELLED },
      actor,
    );
  }

  private async lockMaintenance(manager: EntityManager, id: string) {
    const maintenance = await manager.getRepository(Maintenance).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!maintenance)
      throw new NotFoundException('Mantenimiento no encontrado');
    return maintenance;
  }

  private listQuery(
    query: PaginationQueryDto,
    actor: AuthenticatedUser,
  ): SelectQueryBuilder<Maintenance> | null {
    if (actor.role === UserRole.TECHNICIAN && !actor.mechanicId) return null;

    const builder = this.maintenances
      .createQueryBuilder('maintenance')
      .leftJoinAndSelect('maintenance.vehicle', 'vehicle')
      .leftJoinAndSelect('maintenance.mechanic', 'mechanic')
      .leftJoinAndSelect('maintenance.workshop', 'workshop')
      .orderBy('maintenance.scheduledAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);
    if (actor.role === UserRole.TECHNICIAN) {
      builder.andWhere('maintenance.mechanicId = :mechanicId', {
        mechanicId: actor.mechanicId,
      });
    }
    return builder;
  }

  private async restoreVehicleAvailability(
    manager: EntityManager,
    vehicle: Vehicle,
  ): Promise<void> {
    if (vehicle.status === VehicleStatus.INACTIVE) return;
    const otherActiveMaintenance = await manager
      .getRepository(Maintenance)
      .exists({
        where: {
          vehicleId: vehicle.id,
          status: In([
            MaintenanceStatus.SCHEDULED,
            MaintenanceStatus.IN_PROGRESS,
          ]),
        },
      });
    vehicle.status = otherActiveMaintenance
      ? VehicleStatus.IN_MAINTENANCE
      : VehicleStatus.AVAILABLE;
    await manager.getRepository(Vehicle).save(vehicle);
  }

  private assertCanAccess(
    maintenance: Maintenance,
    actor: AuthenticatedUser,
  ): void {
    if (
      actor.role === UserRole.TECHNICIAN &&
      maintenance.mechanicId !== actor.mechanicId
    ) {
      throw new ForbiddenException(
        'No puedes consultar un mantenimiento no asignado',
      );
    }
  }

  private assertCanOperate(
    maintenance: Maintenance,
    actor: AuthenticatedUser,
  ): void {
    if (actor.role === UserRole.ADMIN) return;
    if (
      actor.role !== UserRole.TECHNICIAN ||
      !actor.mechanicId ||
      maintenance.mechanicId !== actor.mechanicId
    ) {
      throw new ForbiddenException(
        'No tienes permiso para modificar este mantenimiento',
      );
    }
  }
}
