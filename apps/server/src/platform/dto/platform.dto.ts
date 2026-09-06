import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
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

export class StartEgressDto {
  @ApiProperty({
    required: false,
    type: 'array',
    items: { type: 'string' },
    maxItems: 3,
    description: 'RTMP(S) push endpoints (1-3)',
    example: ['rtmp://a.rtmp.youtube.com/live2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @Matches(/^rtmps?:\/\//, {
    each: true,
    message: 'each endpoint must use the rtmp or rtmps scheme',
  })
  @MaxLength(2048, { each: true })
  rtmpEndpoints?: string[];

  @ApiProperty({
    required: false,
    type: 'boolean',
    default: false,
    description: 'Write a live HLS playlist served by the server',
  })
  @IsOptional()
  @IsBoolean()
  hls?: boolean;
}
