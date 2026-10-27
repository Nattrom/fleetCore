import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMechanicDto {
  @ApiProperty({ example: 'Jamie Rivera' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @ApiProperty({ example: 'jamie@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ example: 'Diesel engines' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  specialty: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
