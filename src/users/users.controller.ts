import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { UserRole } from '../common/enums/index.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({ summary: 'List users (ADMIN)' })
  @Get()
  list(@Query() query: PaginationQueryDto) {
    return this.users.list(query);
  }

  @ApiOperation({ summary: 'Create a user with an allowed role (ADMIN)' })
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.createByAdmin(dto, actor.id);
  }

  @ApiOperation({ summary: 'Deactivate a user (ADMIN)' })
  @Post(':id/deactivate')
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.setActive(id, false, actor.id);
  }

  @ApiOperation({ summary: 'Activate a user (ADMIN)' })
  @Post(':id/activate')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.users.setActive(id, true, actor.id);
  }
}
