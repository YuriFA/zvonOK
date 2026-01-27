import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.development',
      isGlobal: true,
      validate: (config) => {
        const required = [
          'DATABASE_URL',
          'JWT_ACCESS_SECRET',
          'JWT_REFRESH_SECRET',
          'JWT_ACCESS_EXPIRES_IN_MINUTES',
          'JWT_REFRESH_EXPIRES_IN_DAYS',
        ];

        const missing = required.filter((key) => !config[key]);
        if (missing.length > 0) {
          throw new Error(
            `Missing required environment variables: ${missing.join(', ')}`,
          );
        }

        const accessMinutes = Number(config.JWT_ACCESS_EXPIRES_IN_MINUTES);
        const refreshDays = Number(config.JWT_REFRESH_EXPIRES_IN_DAYS);

        if (Number.isNaN(accessMinutes) || accessMinutes <= 0) {
          throw new Error('JWT_ACCESS_EXPIRES_IN_MINUTES must be a number > 0');
        }

        if (Number.isNaN(refreshDays) || refreshDays <= 0) {
          throw new Error('JWT_REFRESH_EXPIRES_IN_DAYS must be a number > 0');
        }

        return config;
      },
    }),
    PrismaModule,
    AuthModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
