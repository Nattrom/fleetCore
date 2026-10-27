import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CompleteMaintenanceDto {
  @ApiProperty({ minLength: 2, maxLength: 4000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  workPerformed: string;

  @ApiProperty({ example: '1250.00', pattern: '^\\d{1,10}(\\.\\d{1,2})?$' })
  @Matches(/^\d{1,10}(\.\d{1,2})?$/)
  cost: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  finishedAt: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  finalMileage: number;
}
