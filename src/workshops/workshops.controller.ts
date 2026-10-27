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
import { CreateWorkshopDto } from './dto/create-workshop.dto.js';
import { UpdateWorkshopDto } from './dto/update-workshop.dto.js';
import { WorkshopsService } from './workshops.service.js';

@ApiTags('workshops')
@ApiBearerAuth()
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshops: WorkshopsService) {}

  @Get()
  @ApiOperation({ summary: 'List workshops (ADMIN)' })
  @Roles(UserRole.ADMIN)
  list(@Query() query: PaginationQueryDto) {
    return this.workshops.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workshop by id (ADMIN)' })
  @Roles(UserRole.ADMIN)
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.workshops.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a workshop (ADMIN)' })
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateWorkshopDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workshops.create(dto, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workshop (ADMIN)' })
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkshopDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workshops.update(id, dto, user.id);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a workshop (ADMIN)' })
  @Roles(UserRole.ADMIN)
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workshops.setActive(id, true, user.id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a workshop (ADMIN)' })
  @Roles(UserRole.ADMIN)
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workshops.setActive(id, false, user.id);
  }
}
