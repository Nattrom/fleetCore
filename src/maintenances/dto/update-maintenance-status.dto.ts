import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { MaintenanceStatus } from '../../common/enums/index.js';

export class UpdateMaintenanceStatusDto {
  @ApiProperty({
    enum: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED],
  })
  @IsIn([MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED])
  status: MaintenanceStatus.IN_PROGRESS | MaintenanceStatus.CANCELLED;
}
