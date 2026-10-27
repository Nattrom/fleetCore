import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module.js';
import { Workshop } from './entities/workshop.entity.js';
import { WorkshopsController } from './workshops.controller.js';
import { WorkshopsService } from './workshops.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Workshop]), AuditModule],
  controllers: [WorkshopsController],
  providers: [WorkshopsService],
  exports: [WorkshopsService],
})
export class WorkshopsModule {}
