import { ApiProperty } from '@nestjs/swagger';

export class RoomResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string | null;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  maxParticipants: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  endedAt: Date | null;

  @ApiProperty({ required: false })
  lastActivityAt: Date | null;
}
