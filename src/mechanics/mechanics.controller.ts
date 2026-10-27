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
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/index.js';
import { CreateMechanicDto } from './dto/create-mechanic.dto.js';
import { ListMechanicsDto } from './dto/list-mechanics.dto.js';
import { UpdateMechanicDto } from './dto/update-mechanic.dto.js';
import { MechanicsService } from './mechanics.service.js';

@ApiTags('mechanics')
@ApiBearerAuth()
@Controller('mechanics')
export class MechanicsController {
  constructor(private readonly mechanics: MechanicsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  list(@Query() query: ListMechanicsDto) {
    return this.mechanics.list(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.mechanics.get(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateMechanicDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mechanics.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMechanicDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mechanics.update(id, dto, user.id);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mechanics.setActive(id, true, user.id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.mechanics.setActive(id, false, user.id);
  }
}
