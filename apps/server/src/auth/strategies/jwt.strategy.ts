import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';

interface JwtPayload {
  id: string;
  email: string;
  tokenVersion?: number;
}

const cookieExtractor = (req: Request) => {
  if (!req || !req.cookies) return null;
  return req.cookies['access_token'] as string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    // Validate token version if present
    if (payload.tokenVersion !== undefined) {
      const user = await this.userService.user({ id: payload.id });
      if (user && payload.tokenVersion !== user.tokenVersion) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }
    return { id: payload.id, email: payload.email };
  }
}
