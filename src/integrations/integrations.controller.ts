import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { IntegrationsService } from './integrations.service.js';

@ApiTags('integrations')
@ApiSecurity('x-api-key')
@Public()
@UseGuards(ApiKeyGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('vehicles/:id/maintenance-history')
  vehicleHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.integrations.vehicleHistory(id, query);
  }
}
