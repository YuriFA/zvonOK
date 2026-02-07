import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { PasswordHelper } from './helpers/password.helper';
import { TokenHelper } from './helpers/token.helper';
import { JwtPayloadDto } from './dto/jwt-payload.dto';
import { RefreshTokenHelper } from './helpers/refresh-token.helper';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenHelper: TokenHelper,
  ) {}

  async registerUser(dto: RegisterUserDto) {
    const exists = await this.userService.user({ email: dto.email });
    if (exists) {
      throw new BadRequestException('User already exists');
    }

    const passwordHash = await PasswordHelper.hash(dto.password);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...newUserData } = dto;

    const user = await this.userService.createUser({
      ...newUserData,
      passwordHash,
    });

    this.logger.log(`User registered: ${user.email} (ID: ${user.id})`);

    return this.issueTokens(user);
  }

  async loginUser(loginDto: LoginUserDto) {
    const user = await this.userService.user({ email: loginDto.email });

    if (!user) {
      this.logger.warn(`Failed login attempt: email not found (${loginDto.email})`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const lockedMinutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      this.logger.warn(
        `Locked login attempt: ${user.email} (locked for ${lockedMinutesRemaining} more minutes)`,
      );
      throw new UnauthorizedException(
        `Account is locked. Try again in ${lockedMinutesRemaining} minutes.`,
      );
    }

    // Reset lockout if period has passed
    if (user.lockedUntil && user.lockedUntil <= new Date()) {
      await this.userService.updateUser({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
    }

    const valid = await PasswordHelper.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!valid) {
      const newAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;

      if (shouldLock) {
        const lockedUntil = new Date(
          Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
        );
        await this.userService.updateUser({
          where: { id: user.id },
          data: { failedLoginAttempts: newAttempts, lockedUntil },
        });
        this.logger.warn(
          `Account locked: ${user.email} after ${newAttempts} failed attempts`,
        );
        throw new UnauthorizedException(
          `Too many failed login attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`,
        );
      }

      await this.userService.updateUser({
        where: { id: user.id },
        data: { failedLoginAttempts: newAttempts },
      });
      this.logger.warn(
        `Failed login attempt: ${user.email} (${newAttempts}/${MAX_LOGIN_ATTEMPTS} attempts)`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts && user.failedLoginAttempts > 0) {
      await this.userService.updateUser({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    this.logger.log(`User logged in: ${user.email} (ID: ${user.id})`);

    return this.issueTokens(user, user.tokenVersion ?? 0);
  }

  async logout(user: JwtPayloadDto) {
    await this.userService.updateRefreshTokenHash(user.id, null);
    this.logger.log(`User logged out: ${user.email} (ID: ${user.id})`);
  }

  async refreshToken(user: JwtPayloadDto) {
    const dbUser = await this.userService.user({ id: user.id });
    if (!dbUser) {
      throw new UnauthorizedException('Invalid user');
    }

    const accessToken = this.tokenHelper.generateAccessToken({
      id: user.id,
      email: user.email,
      tokenVersion: dbUser.tokenVersion ?? 0,
    });
    const refreshToken = this.tokenHelper.generateRefreshToken({
      id: user.id,
      email: user.email,
      tokenVersion: dbUser.tokenVersion ?? 0,
    });

    await this.userService.updateRefreshTokenHash(
      user.id,
      RefreshTokenHelper.hash(refreshToken),
    );

    this.logger.log(`Token refreshed: ${user.email} (ID: ${user.id})`);

    return { accessToken, refreshToken };
  }

  private async issueTokens(user: { id: string; email: string; tokenVersion?: number }, tokenVersion = 0) {
    const payload = {
      id: user.id,
      email: user.email,
      tokenVersion,
    };

    const accessToken = this.tokenHelper.generateAccessToken(payload);
    const refreshToken = this.tokenHelper.generateRefreshToken(payload);

    await this.userService.updateRefreshTokenHash(
      user.id,
      RefreshTokenHelper.hash(refreshToken),
    );

    return { accessToken, refreshToken };
  }
}
