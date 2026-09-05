import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreatePlatformRoomDto {
  @ApiProperty({ required: false, type: 'string', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({ required: false, default: 10, minimum: 2, maximum: 50 })
  @IsOptional()
  @Min(2)
  @Max(50)
  maxParticipants?: number;
}

export class MintRoomTokenDto {
  @ApiProperty({
    required: false,
    type: 'string',
    description: 'Participant display name',
    example: 'Alice',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({
    required: false,
    type: 'boolean',
    default: true,
    description: 'Whether the participant may publish audio/video/screen',
  })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;

  @ApiProperty({
    required: false,
    type: 'boolean',
    default: false,
    description: 'Whether the participant holds room-admin rights',
  })
  @IsOptional()
  @IsBoolean()
  admin?: boolean;
}
