import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { UserRole } from '../common/enums/index.js';
import { CompleteMaintenanceDto } from './dto/complete-maintenance.dto.js';
import { CreateMaintenanceDto } from './dto/create-maintenance.dto.js';
import { ListMaintenancesDto } from './dto/list-maintenances.dto.js';
import { UpdateMaintenanceStatusDto } from './dto/update-maintenance-status.dto.js';
import { MaintenancesService } from './maintenances.service.js';

@ApiTags('maintenances')
@ApiBearerAuth()
@Controller('maintenances')
export class MaintenancesController {
  constructor(private readonly maintenances: MaintenancesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a maintenance order (ADMIN)' })
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateMaintenanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenances.create(dto, user);
  }

  @Get('active')
  @ApiOperation({
    summary: 'List active maintenances (ADMIN: all, TECHNICIAN: own)',
  })
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  active(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenances.active(query, user);
  }

  @Get('my-assignments')
  @ApiOperation({ summary: 'List my assigned maintenances (TECHNICIAN)' })
  @Roles(UserRole.TECHNICIAN)
  myAssignments(
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenances.myAssignments(query, user);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'List maintenances with filters (ADMIN: all, TECHNICIAN: own)',
  })
  list(
    @Query() query: ListMaintenancesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenances.list(query, user);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Get a maintenance by id (ADMIN, TECHNICIAN own)' })
  get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenances.get(id, user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Change maintenance status (ADMIN, TECHNICIAN own)',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenanceStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenances.updateStatus(id, dto, user);
  }

  @Patch(':id/complete')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Complete a maintenance (ADMIN, TECHNICIAN own)',
  })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteMaintenanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenances.complete(id, dto, user);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({ summary: 'Cancel a maintenance (ADMIN, TECHNICIAN own)' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenances.cancel(id, user);
  }
}

@ApiTags('maintenance history')
@ApiBearerAuth()
@Controller()
export class MaintenanceHistoryController {
  constructor(private readonly maintenances: MaintenancesService) {}

  @Get('vehicles/:id/maintenances')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Maintenance history of a vehicle (ADMIN)' })
  forVehicle(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.maintenances.forVehicle(id, query);
  }

  @Get('mechanics/:id/maintenances')
  @Roles(UserRole.ADMIN, UserRole.TECHNICIAN)
  @ApiOperation({
    summary: 'Maintenance history of a mechanic (ADMIN, TECHNICIAN own)',
  })
  forMechanic(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.maintenances.forMechanic(id, query, user);
  }
}
