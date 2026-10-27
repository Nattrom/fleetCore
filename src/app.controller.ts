import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator.js';

@ApiTags('health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness check used by Docker and monitors' })
  @ApiOkResponse({
    description: 'The API process is running',
    schema: { example: { status: 'ok' } },
  })
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
