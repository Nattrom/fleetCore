import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import {
  PaginationQueryDto,
  paginated,
} from '../common/dto/pagination-query.dto.js';
import { MaintenanceStatus } from '../common/enums/index.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { Workshop } from './entities/workshop.entity.js';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshops: Repository<Workshop>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationQueryDto) {
    const [items, total] = await this.workshops.findAndCount({
      where: { isActive: true },
      order: { name: 'ASC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async get(id: string): Promise<Workshop> {
    const workshop = await this.workshops.findOne({ where: { id } });
    if (!workshop) throw new NotFoundException('Workshop not found');
    return workshop;
  }

  async create(dto: CreateWorkshopDto, actorId: string): Promise<Workshop> {
    const workshop = await this.workshops.save(
      this.workshops.create({
        name: dto.name.trim(),
        address: dto.address.trim(),
        isActive: true,
      }),
    );
    await this.audit.record({
      userId: actorId,
      action: 'CREATE',
      entity: 'Workshop',
      entityId: workshop.id,
    });
    return workshop;
  }

  async update(
    id: string,
    dto: UpdateWorkshopDto,
    actorId: string,
  ): Promise<Workshop> {
    const workshop = await this.get(id);
    if (dto.name !== undefined) workshop.name = dto.name.trim();
    if (dto.address !== undefined) workshop.address = dto.address.trim();
    const saved = await this.workshops.save(workshop);
    await this.audit.record({
      userId: actorId,
      action: 'UPDATE',
      entity: 'Workshop',
      entityId: id,
      details: { fields: Object.keys(dto) },
    });
    return saved;
  }

  async setActive(
    id: string,
    active: boolean,
    actorId: string,
  ): Promise<Workshop> {
    return this.dataSource.transaction(async (manager) => {
      const workshop = await manager.getRepository(Workshop).findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!workshop) throw new NotFoundException('Workshop not found');
      if (
        !active &&
        (await manager.getRepository(Maintenance).exists({
          where: {
            workshopId: id,
            status: In([
              MaintenanceStatus.SCHEDULED,
              MaintenanceStatus.IN_PROGRESS,
            ]),
          },
        }))
      ) {
        throw new ConflictException(
          'A workshop with active maintenance cannot be deactivated',
        );
      }
      workshop.isActive = active;
      const saved = await manager.getRepository(Workshop).save(workshop);
      await this.audit.record(
        {
          userId: actorId,
          action: active ? 'ACTIVATE' : 'DEACTIVATE',
          entity: 'Workshop',
          entityId: id,
        },
        manager,
      );
      return saved;
    });
  }
}
