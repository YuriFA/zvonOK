import { ApiProperty } from '@nestjs/swagger';

import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  NotContains,
} from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    description: 'Email',
    uniqueItems: true,
    nullable: false,
    required: true,
    type: 'string',
    example: 'youremail@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Username',
    uniqueItems: true,
    nullable: false,
    required: true,
    type: 'string',
    example: 'johndoe',
  })
  @IsString()
  @MinLength(3)
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
