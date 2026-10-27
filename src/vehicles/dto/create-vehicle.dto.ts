import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'ABC123' })
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  plate: string;

  @ApiProperty({ example: 'Volvo' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  brand: string;

  @ApiProperty({ example: 'FH' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  model: string;

  @ApiProperty({ example: 2022, minimum: 1886 })
  @IsInt()
  @Min(1886)
  @Max(2100)
  year: number;

  @ApiProperty({ example: 42500, minimum: 0 })
  @IsInt()
  @Min(0)
  mileage: number;
}
