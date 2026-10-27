import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration.js';
import { envValidationSchema } from './config/env.validation.js';
import { User } from './users/entities/user.entity.js';
import { Vehicle } from './vehicles/entities/vehicle.entity.js';
import { Mechanic } from './mechanics/entities/mechanic.entity.js';
import { Workshop } from './workshops/entities/workshop.entity.js';
import { Maintenance } from './maintenances/entities/maintenance.entity.js';
import { AuditLog } from './audit/entities/audit-log.entity.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';
import { AuditModule } from './audit/audit.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { MechanicsModule } from './mechanics/mechanics.module.js';
import { WorkshopsModule } from './workshops/workshops.module.js';
import { IntegrationsModule } from './integrations/integrations.module.js';
import { MaintenancesModule } from './maintenances/maintenances.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: (config) => envValidationSchema.parse(config),
    }),
    TypeOrmModule.forRootAsync({
      inject: [],
      useFactory: () => ({
        type: 'postgres' as const,
        host: process.env.DB_HOST ?? 'localhost',
        port: Number.parseInt(process.env.DB_PORT ?? '5435', 10),
        username: process.env.DB_USERNAME ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'fleetcore',
        entities: [User, Vehicle, Mechanic, Workshop, Maintenance, AuditLog],
        synchronize: false,
        migrationsRun: false,
      }),
    }),
    AuditModule,
    AuthModule,
    VehiclesModule,
    MechanicsModule,
    WorkshopsModule,
    IntegrationsModule,
    MaintenancesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
