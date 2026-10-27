import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../common/enums/index.js';

export class CreateUserDto {
  @ApiProperty({ example: 'Alex Morgan' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @ApiProperty({ example: 'alex@example.com' })
  @IsEmail()
  @MaxLength(320)
  email: string;

  @ApiProperty({ minLength: 12, format: 'password' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}
