import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateWorkshopDto {
  @ApiProperty({ example: 'Central Workshop' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name: string;

  @ApiProperty({ example: '123 Industrial Avenue' })
  @IsString()
  @MinLength(4)
  @MaxLength(500)
  address: string;
}
