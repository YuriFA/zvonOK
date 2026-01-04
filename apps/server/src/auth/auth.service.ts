import type { Response } from 'express';
import { Injectable } from '@nestjs/common';
// import * as bcrypt from 'bcrypt';
import { User, UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private readonly userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(
    email: string,
    password: string,
  ): Promise<
    { status: true; payload: User } | { status: false; message: string }
  > {
    const user = await this.userService.findByEmail(email);
    // if (user && (await bcrypt.compare(password, user.password))) {
    if (user && password === user.password) {
      return { status: true, payload: user }; // Password matches
    } else {
      return { status: false, message: 'Invalid email or password!' };
    }
  }

  async login(loginDto: LoginDto, res: Response) {
    const validationResult = await this.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (validationResult.status === false) {
      res.status(401).send(validationResult.message);
      return;
    }

    const payload = {
      sub: validationResult.payload.id,
      name: validationResult.payload.username,
      email: validationResult.payload.email,
    };
    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<`${number}h`>('JWT_EXPIRES_IN'),
      secret: this.configService.get<string>('JWT_SECRET'),
    });
    res.cookie('access_token', access_token, {
      httpOnly: true,
      secure: true,
    });
    res.send('Login Successful!');
  }
}
