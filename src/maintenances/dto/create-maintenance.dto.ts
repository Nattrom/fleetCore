import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MaintenanceType } from '../../common/enums/index.js';

export class CreateMaintenanceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  vehicleId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  mechanicId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  workshopId: string;

  @ApiProperty({ enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @ApiProperty({ minLength: 4, maxLength: 2000 })
  @IsString()
  @MinLength(4)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  mileage: number;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  scheduledAt: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  scheduledEndAt: string;
}
