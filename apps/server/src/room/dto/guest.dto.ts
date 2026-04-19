import { IsString, MaxLength, MinLength } from 'class-validator';

export class GuestRequestDto {
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  displayName: string;
}

export class GuestActionDto {
  @IsString()
  requestId: string;
}
