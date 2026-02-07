import { IsString, IsNumber } from 'class-validator';

export class JwtPayloadDto {
  @IsString()
  id: string;

  @IsString()
  email: string;

  @IsNumber()
  tokenVersion?: number;
}
