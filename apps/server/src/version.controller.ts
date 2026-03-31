import { Controller, Get } from '@nestjs/common';
import { APP_NAME, VERSION } from './version';

@Controller()
export class VersionController {
  @Get('version')
  getVersion() {
    return { version: VERSION, name: APP_NAME };
  }
}
