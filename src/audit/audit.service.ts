import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity.js';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
  ) {}

  async record(entry: AuditEntry, manager?: EntityManager): Promise<void> {
    const repository = manager?.getRepository(AuditLog) ?? this.auditRepository;
    await repository.save(
      repository.create({
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        details: entry.details ?? null,
        ip: entry.ip ?? null,
        userAgent: entry.userAgent?.slice(0, 500) ?? null,
      }),
    );
  }
}
