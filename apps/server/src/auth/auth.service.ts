import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { PasswordHelper } from './helpers/password.helper';
import { JwtService } from '@nestjs/jwt';
import { TokenHelper } from './helpers/token.helper';
import { ConfigService } from '@nestjs/config';
import { JwtPayloadDto } from './dto/jwt-payload.dto';
import { User } from 'src/generated/prisma/client';

@Injectable()
export class AuthService {
  private tokenHelper: TokenHelper;

  constructor(
    private readonly userService: UserService,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.tokenHelper = new TokenHelper(jwtService, configService);
  }

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

    return this.issueTokens(user);
  }

  async loginUser(loginDto: LoginUserDto) {
    const user = await this.userService.user({ email: loginDto.email });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await PasswordHelper.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user);
  }

  async logout(user: JwtPayloadDto) {
    await this.userService.updateRefreshTokenHash(user.id, null);
  }

  async refreshToken(user: JwtPayloadDto) {
    const accessToken = this.tokenHelper.generateAccessToken(user);
    const refreshToken = this.tokenHelper.generateRefreshToken(user);

    await this.userService.updateRefreshTokenHash(
      user.id,
      await PasswordHelper.hash(refreshToken),
    );

    return { accessToken, refreshToken };
  }

  private async issueTokens(user: User) {
    const accessToken = this.tokenHelper.generateAccessToken({
      id: user.id,
      email: user.email,
    });
    const refreshToken = this.tokenHelper.generateRefreshToken({
      id: user.id,
      email: user.email,
    });

    await this.userService.updateRefreshTokenHash(
      user.id,
      await PasswordHelper.hash(refreshToken),
    );

    return { accessToken, refreshToken };
  }
}
