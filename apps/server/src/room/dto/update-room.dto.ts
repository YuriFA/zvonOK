import { IsOptional, IsString, IsEnum, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoomDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, enum: ['active', 'ended'] })
  @IsOptional()
  @IsEnum(['active', 'ended'])
  status?: 'active' | 'ended';

  @ApiProperty({ required: false })
  @IsOptional()
  @Min(2)
  @Max(50)
  maxParticipants?: number;
}
