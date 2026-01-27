import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import { PasswordHelper } from '../helpers/password.helper';

interface JwtPayload {
  id: string;
  email: string;
}

const cookieExtractor = (req: Request) => {
  if (!req || !req.cookies) return null;
  return req.cookies['refresh_token'] as string;
};

@Injectable()
export class JwtRefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh-token',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly logger: Logger,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const cookieToken = req?.cookies?.['refresh_token'] as string | undefined;
    const authHeader = req?.headers?.authorization;
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;
    const refreshToken = cookieToken ?? headerToken;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const user = await this.userService.user({ id: payload.id });

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isRefreshTokenValid = await PasswordHelper.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      await this.userService.updateRefreshTokenHash(user.id, null);
      this.logger.warn('Refresh token reuse detected', {
        userId: user.id,
        email: user.email,
      });
      throw new UnauthorizedException({
        message: 'Refresh token reuse detected',
        code: 'REFRESH_REUSE_DETECTED',
      });
    }

    return { id: user.id, email: user.email };
  }
}
