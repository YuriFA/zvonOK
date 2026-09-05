import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class DevJwtGuard extends AuthGuard('dev-jwt') {}
