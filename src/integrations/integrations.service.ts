import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaginationQueryDto,
  paginated,
} from '../common/dto/pagination-query.dto.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';

@Injectable()
export class IntegrationsService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Maintenance)
    private readonly maintenances: Repository<Maintenance>,
  ) {}

  async vehicleHistory(id: string, query: PaginationQueryDto) {
    const vehicle = await this.vehicles.findOne({
      where: { id },
      select: {
        id: true,
        plate: true,
        brand: true,
        model: true,
        status: true,
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    const [records, total] = await this.maintenances.findAndCount({
      where: { vehicleId: id },
      relations: { mechanic: true, workshop: true },
      select: {
        id: true,
        type: true,
        status: true,
        description: true,
        mileage: true,
        cost: true,
        finishedAt: true,
        scheduledAt: true,
        mechanic: { id: true, name: true },
        workshop: { id: true, name: true },
      },
      order: { scheduledAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      vehicle: {
        id: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        availability: vehicle.status,
      },
      history: paginated(
        records.map((maintenance) => ({
          id: maintenance.id,
          type: maintenance.type,
          status: maintenance.status,
          description: maintenance.description,
          mileage: maintenance.mileage,
          cost: maintenance.cost,
          finishedAt: maintenance.finishedAt,
          mechanic: maintenance.mechanic.name,
          workshop: maintenance.workshop.name,
        })),
        query.page,
        query.limit,
        total,
      ),
    };
  }
}
