import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface DevJwtPayload {
  sub: string;
  username: string;
}

@Injectable()
export class DevJwtStrategy extends PassportStrategy(Strategy, 'dev-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_DEV_SECRET')!,
    });
  }

  validate(payload: DevJwtPayload) {
    return { id: payload.sub, username: payload.username };
  }
}
