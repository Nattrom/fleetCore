import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { Maintenance } from '../maintenances/entities/maintenance.entity.js';
import { Vehicle } from '../vehicles/entities/vehicle.entity.js';
import { IntegrationsController } from './integrations.controller.js';
import { IntegrationsService } from './integrations.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, Maintenance])],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, ApiKeyGuard],
})
export class IntegrationsModule {}
