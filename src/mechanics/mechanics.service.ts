import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { paginated } from '../common/dto/pagination-query.dto.js';
import { MaintenanceStatus, UserRole } from '../common/enums/index.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { User } from '../users/entities/user.entity.js';
import { CreateMechanicDto } from './dto/create-mechanic.dto.js';
import { ListMechanicsDto } from './dto/list-mechanics.dto.js';
import { UpdateMechanicDto } from './dto/update-mechanic.dto.js';
import { Mechanic } from './entities/mechanic.entity.js';

@Injectable()
export class MechanicsService {
  constructor(
    @InjectRepository(Mechanic)
    private readonly mechanics: Repository<Mechanic>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(query: ListMechanicsDto) {
    const [items, total] = await this.mechanics.findAndCount({
      ...(query.isActive !== undefined && {
        where: { isActive: query.isActive },
      }),
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async get(id: string): Promise<Mechanic> {
    const mechanic = await this.mechanics.findOne({ where: { id } });
    if (!mechanic) throw new NotFoundException('Mechanic not found');
    return mechanic;
  }

  async create(dto: CreateMechanicDto, actorId: string): Promise<Mechanic> {
    const mechanic = this.mechanics.create({
      ...dto,
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      specialty: dto.specialty.trim(),
      isActive: true,
    });
    if (dto.userId) {
      await this.assertTechnicianUser(dto.userId);
      mechanic.userId = dto.userId;
    }
    const saved = await this.mechanics.save(mechanic);
    await this.audit.record({
      userId: actorId,
      action: 'CREATE',
      entity: 'Mechanic',
      entityId: saved.id,
      details: { userId: saved.userId },
    });
    return saved;
  }

  async update(
    id: string,
    dto: UpdateMechanicDto,
    actorId: string,
  ): Promise<Mechanic> {
    const mechanic = await this.get(id);
    if (dto.userId !== undefined && dto.userId !== mechanic.userId) {
      await this.assertTechnicianUser(dto.userId);
      mechanic.userId = dto.userId;
    }
    Object.assign(mechanic, {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase() }),
      ...(dto.specialty !== undefined && { specialty: dto.specialty.trim() }),
    });
    const saved = await this.mechanics.save(mechanic);
    await this.audit.record({
      userId: actorId,
      action: 'UPDATE',
      entity: 'Mechanic',
      entityId: id,
      details: { fields: Object.keys(dto) },
    });
    return saved;
  }

  async setActive(
    id: string,
    active: boolean,
    actorId: string,
  ): Promise<Mechanic> {
    return this.dataSource.transaction(async (manager) => {
      const mechanic = await manager.getRepository(Mechanic).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!mechanic) throw new NotFoundException('Mechanic not found');
      if (
        !active &&
        (await manager.getRepository(Maintenance).exists({
          where: {
            mechanicId: id,
            status: In([
              MaintenanceStatus.SCHEDULED,
              MaintenanceStatus.IN_PROGRESS,
            ]),
          },
        }))
      ) {
        throw new ConflictException(
          'A mechanic with active maintenance cannot be deactivated',
        );
      }
      mechanic.isActive = active;
      const saved = await manager.getRepository(Mechanic).save(mechanic);
      await this.audit.record(
        {
          userId: actorId,
          action: active ? 'ACTIVATE' : 'DEACTIVATE',
          entity: 'Mechanic',
          entityId: id,
        },
        manager,
      );
      return saved;
    });
  }

  private async assertTechnicianUser(userId: string): Promise<void> {
    const user = await this.users.findOne({
      where: { id: userId, isActive: true },
    });
    if (!user || user.role !== UserRole.TECHNICIAN) {
      throw new ConflictException(
        'The user must exist, be active, and have the TECHNICIAN role',
      );
    }
    const alreadyLinked = await this.mechanics.findOne({ where: { userId } });
    if (alreadyLinked) {
      throw new ConflictException(
        'The user is already linked to another mechanic',
      );
    }
  }
}
