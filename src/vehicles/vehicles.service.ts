import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { paginated } from '../common/dto/pagination-query.dto.js';
import { MaintenanceStatus, VehicleStatus } from '../common/enums/index.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { ListVehiclesDto } from './dto/list-vehicles.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { Vehicle } from './entities/vehicle.entity.js';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListVehiclesDto) {
    const [items, total] = await this.vehicles.findAndCount({
      where: {
        ...(query.status && { status: query.status }),
        ...(query.plate && { plate: ILike(`%${query.plate.trim()}%`) }),
      },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async get(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findOne({ where: { id } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    return vehicle;
  }

  async getByPlate(plate: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findOne({
      where: { plate: this.normalizePlate(plate) },
    });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
    return vehicle;
  }

  async create(dto: CreateVehicleDto, actorId: string): Promise<Vehicle> {
    const plate = this.normalizePlate(dto.plate);
    if (await this.vehicles.findOne({ where: { plate } })) {
      throw new ConflictException('La placa ya está registrada');
    }
    const vehicle = await this.vehicles.save(
      this.vehicles.create({
        ...dto,
        plate,
        brand: dto.brand.trim(),
        model: dto.model.trim(),
        status: VehicleStatus.AVAILABLE,
      }),
    );
    await this.audit.record({
      userId: actorId,
      action: 'CREATE',
      entity: 'Vehicle',
      entityId: vehicle.id,
      details: { plate },
    });
    return vehicle;
  }

  async update(
    id: string,
    dto: UpdateVehicleDto,
    actorId: string,
  ): Promise<Vehicle> {
    return this.dataSource.transaction(async (manager) => {
      const vehicle = await manager.getRepository(Vehicle).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
      if (dto.mileage !== undefined && dto.mileage < vehicle.mileage) {
        throw new ConflictException('El kilometraje no puede disminuir');
      }
      if (dto.mileage !== undefined && dto.mileage !== vehicle.mileage) {
        const hasActiveMaintenance = await manager
          .getRepository(Maintenance)
          .exists({
            where: {
              vehicleId: id,
              status: In([
                MaintenanceStatus.SCHEDULED,
                MaintenanceStatus.IN_PROGRESS,
              ]),
            },
          });
        if (hasActiveMaintenance) {
          throw new ConflictException(
            'El kilometraje no puede editarse durante un mantenimiento activo',
          );
        }
      }
      if (dto.plate !== undefined) {
        const plate = this.normalizePlate(dto.plate);
        const duplicate = await manager
          .getRepository(Vehicle)
          .findOne({ where: { plate } });
        if (duplicate && duplicate.id !== id) {
          throw new ConflictException('La placa ya está registrada');
        }
        vehicle.plate = plate;
      }
      Object.assign(vehicle, {
        ...(dto.brand !== undefined && { brand: dto.brand.trim() }),
        ...(dto.model !== undefined && { model: dto.model.trim() }),
        ...(dto.year !== undefined && { year: dto.year }),
        ...(dto.mileage !== undefined && { mileage: dto.mileage }),
      });
      const saved = await manager.getRepository(Vehicle).save(vehicle);
      await this.audit.record(
        {
          userId: actorId,
          action: 'UPDATE',
          entity: 'Vehicle',
          entityId: id,
          details: { fields: Object.keys(dto) },
        },
        manager,
      );
      return saved;
    });
  }

  async deactivate(id: string, actorId: string): Promise<Vehicle> {
    return this.dataSource.transaction(async (manager) => {
      const vehicle = await manager.getRepository(Vehicle).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!vehicle) throw new NotFoundException('Vehículo no encontrado');
      const activeMaintenance = await manager
        .getRepository(Maintenance)
        .exists({
          where: {
            vehicleId: id,
            status: In([
              MaintenanceStatus.SCHEDULED,
              MaintenanceStatus.IN_PROGRESS,
            ]),
          },
        });
      if (activeMaintenance) {
        throw new ConflictException(
          'No se puede inactivar un vehículo con mantenimiento activo',
        );
      }
      vehicle.status = VehicleStatus.INACTIVE;
      const saved = await manager.getRepository(Vehicle).save(vehicle);
      await this.audit.record(
        {
          userId: actorId,
          action: 'DEACTIVATE',
          entity: 'Vehicle',
          entityId: id,
        },
        manager,
      );
      return saved;
    });
  }

  private normalizePlate(plate: string): string {
    return plate.trim().toUpperCase();
  }
}
