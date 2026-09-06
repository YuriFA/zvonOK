import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  NotContains,
} from 'class-validator';

export class RegisterDeveloperDto {
  @ApiProperty({
    description: 'Username (letters, digits, _ and -)',
    uniqueItems: true,
    nullable: false,
    required: true,
    type: 'string',
    example: 'platform-dev',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username may only contain letters, digits, _ and -',
  })
  username: string;

  @ApiProperty({
    description:
      'Password: Min 6 characters, 1 uppercase, 1 lowercase and 1 number',
    nullable: false,
    required: true,
    type: 'string',
    example: 'Password123',
  })
  @IsString()
  @MinLength(6)
  @MaxLength(64)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message:
      'Password must contain at least one uppercase, one lowercase and one number',
  })
  @NotContains(' ', { message: 'Password must not contain spaces' })
  password: string;
}

export class LoginDeveloperDto {
  @ApiProperty({ nullable: false, required: true, type: 'string' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ nullable: false, required: true, type: 'string' })
  @IsString()
  password: string;
}

export class CreateProjectDto {
  @ApiProperty({
    nullable: false,
    required: true,
    type: 'string',
    example: 'my-video-app',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;
}

export class SetWebhookDto {
  @ApiProperty({
    description: 'Webhook endpoint URL (https only)',
    nullable: false,
    required: true,
    type: 'string',
    example: 'https://example.com/hooks/zvonok',
  })
  @IsUrl({
    protocols: ['https'],
    require_protocol: true,
    require_tld: false,
  })
  @MaxLength(2048)
  url: string;
}
