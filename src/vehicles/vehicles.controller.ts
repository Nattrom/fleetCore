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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { UserRole } from '../common/enums/index.js';
import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { ListVehiclesDto } from './dto/list-vehicles.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';
import { VehiclesService } from './vehicles.service.js';

@ApiTags('vehicles')
@ApiBearerAuth()
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Get('plate/:plate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  getByPlate(@Param('plate') plate: string) {
    return this.vehicles.getByPlate(plate);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  list(@Query() query: ListVehiclesDto) {
    return this.vehicles.list(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.vehicles.get(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehicles.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehicles.update(id, dto, user.id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vehicles.deactivate(id, user.id);
  }
}
