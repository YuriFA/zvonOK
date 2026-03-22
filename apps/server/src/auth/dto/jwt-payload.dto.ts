import { IsString, IsNumber, IsEnum } from 'class-validator';
import { Role } from 'src/generated/prisma/enums';

export class JwtPayloadDto {
  @IsString()
  id: string;

  @IsString()
  email: string;

  @IsEnum(Role)
  role: Role;

  @IsNumber()
  tokenVersion?: number;
}
