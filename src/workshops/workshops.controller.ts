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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { UserRole } from '../common/enums/index.js';
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { WorkshopsService } from './workshops.service.js';

@ApiTags('workshops')
@ApiBearerAuth()
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshops: WorkshopsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  list(@Query() query: PaginationQueryDto) {
    return this.workshops.list(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.workshops.get(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateWorkshopDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workshops.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkshopDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workshops.update(id, dto, user.id);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workshops.setActive(id, true, user.id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workshops.setActive(id, false, user.id);
  }
}
