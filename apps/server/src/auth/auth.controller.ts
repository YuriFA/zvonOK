import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { SkipAuthGuard } from './skip-auth.guard';
import { RegisterUserDto } from './dto/register-user.dto';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { User } from 'src/user/decorators/user.decorator';
import { JwtPayloadDto } from './dto/jwt-payload.dto';
import { JwtRefreshAuthGuard } from './jwt-refresh-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @ApiResponse({
    status: 201,
    description: 'It will return a new user object.',
  })
  @SkipAuthGuard()
  @Post('register')
  async register(
    @Body() dto: RegisterUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.registerUser(dto);
    this.setCookies(res, tokens);
    return { success: true, tokens };
  }

  @ApiOperation({ summary: 'Login user' })
  @HttpCode(HttpStatus.OK)
  @SkipAuthGuard()
  @Post('login')
  async login(
    @Body() loginDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.loginUser(loginDto);
    this.setCookies(res, tokens);
    return { success: true, tokens };
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token' })
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh-token')
  async refreshToken(
    @User() user: JwtPayloadDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } =
      await this.authService.refreshToken(user);
    this.setAccessCookie(res, accessToken);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @Post('logout')
  async logout(
    @User() user: JwtPayloadDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user);
    this.clearCookies(res);
    return { success: true };
  }

  private clearCookies = (res: Response) => {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  };

  private setCookies(
    res: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    this.setAccessCookie(res, tokens.accessToken);
    this.setRefreshCookie(res, tokens.refreshToken);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge:
        Number(this.configService.get<number>('JWT_REFRESH_EXPIRES_IN_DAYS')) *
        24 *
        60 *
        60 *
        1000,
      path: '/',
    });
  }

  private setAccessCookie(res: Response, accessToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge:
        Number(
          this.configService.get<number>('JWT_ACCESS_EXPIRES_IN_MINUTES'),
        ) *
        60 *
        1000,
    });
  }
}
