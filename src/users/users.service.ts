import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import {
  PaginationQueryDto,
  paginated,
} from '../common/dto/pagination-query.dto.js';
import { UserRole } from '../common/enums/index.js';
import { User } from './entities/user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  create(user: Partial<User>): Promise<User> {
    return this.users.save(this.users.create(user));
  }

  async list(query: PaginationQueryDto) {
    const [items, total] = await this.users.findAndCount({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
    return paginated(items, query.page, query.limit, total);
  }

  async createByAdmin(dto: CreateUserDto, actorId: string) {
    const email = dto.email.trim().toLowerCase();
    if (await this.findByEmail(email)) {
      throw new ConflictException('El correo ya está registrado');
    }
    const user = await this.users.save(
      this.users.create({
        name: dto.name.trim(),
        email,
        passwordHash: await argon2.hash(dto.password),
        role: dto.role,
      }),
    );
    await this.audit.record({
      userId: actorId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      details: { role: user.role },
    });
    return this.toPublicUser(user);
  }

  async setActive(id: string, active: boolean, actorId: string) {
    if (id === actorId && !active) {
      throw new ConflictException('No puedes inactivar tu propio usuario');
    }

    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtext('fleetcore-admin-user-status'))`,
      );
      const users = manager.getRepository(User);
      const user = await users.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      if (!active && user.role === UserRole.ADMIN && user.isActive) {
        const activeAdmins = await users.count({
          where: { role: UserRole.ADMIN, isActive: true },
        });
        if (activeAdmins <= 1) {
          throw new ConflictException(
            'Debe existir al menos un administrador activo',
          );
        }
      }

      user.isActive = active;
      const saved = await users.save(user);
      await this.audit.record(
        {
          userId: actorId,
          action: active ? 'ACTIVATE' : 'DEACTIVATE',
          entity: 'User',
          entityId: id,
        },
        manager,
      );
      return this.toPublicUser(saved);
    });
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}
