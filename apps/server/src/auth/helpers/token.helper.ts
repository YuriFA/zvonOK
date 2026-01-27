import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayloadDto } from '../dto/jwt-payload.dto';

export class TokenHelper {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  generateAccessToken(payload: JwtPayloadDto) {
    return this.jwt.sign(payload, {
      expiresIn: `${Number(this.config.get<number>('JWT_ACCESS_EXPIRES_IN_MINUTES'))}m`,
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
    });
  }

  generateRefreshToken(payload: JwtPayloadDto) {
    return this.jwt.sign(payload, {
      expiresIn: `${Number(this.config.get<number>('JWT_REFRESH_EXPIRES_IN_DAYS'))}d`,
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
    });
  }
}
