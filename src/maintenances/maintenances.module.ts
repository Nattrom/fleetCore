import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module.js';
import { Mechanic } from '../mechanics/entities/mechanic.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { Workshop } from '../workshops/entities/workshop.entity.js';
import { Maintenance } from './entities/maintenance.entity.js';
import {
  MaintenanceHistoryController,
  MaintenancesController,
} from './maintenances.controller.js';
import { MaintenancesService } from './maintenances.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Maintenance, Vehicle, Mechanic, Workshop]),
    AuditModule,
  ],
  controllers: [MaintenancesController, MaintenanceHistoryController],
  providers: [MaintenancesService],
  exports: [MaintenancesService],
})
export class MaintenancesModule {}
