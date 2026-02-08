import { IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRoomDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @Min(2)
  @Max(50)
  maxParticipants?: number;
}
