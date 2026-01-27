import { IsString, IsUUID } from 'class-validator';

export class JwtPayloadDto {
  @IsUUID()
  id: string;

  @IsString()
  email: string;
}
