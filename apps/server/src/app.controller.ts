import { Controller, UseGuards, Req, Ip, Get } from '@nestjs/common';
import { AuthGuard } from './auth/jwt-auth.guard';
import type { Request } from 'express';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(AuthGuard)
  @Get()
  getHello(@Req() req: Request, @Ip() ip: string): string {
    console.log(
      `GetHello call from IP: ${ip}, User: ${JSON.stringify(req.user)}`,
    );
    return this.appService.getHello();
  }
}
