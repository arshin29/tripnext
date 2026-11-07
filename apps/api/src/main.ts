import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('TripNextAPI');
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown hooks for clean socket and database disconnect
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 4001);
  const rawCorsOrigin = configService.get<string>(
    'corsOrigin',
    'http://localhost:3000,http://localhost:3001',
  );
  const allowedOrigins = rawCorsOrigin.includes(',')
    ? rawCorsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : rawCorsOrigin;

  // Parse HTTP cookies
  app.use(cookieParser());

  // Global prefix /api
  app.setGlobalPrefix('api');

  // CORS configuration
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  // Global validation pipe with whitelist, forbidNonWhitelisted and transform
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Centralised error handling filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Structured logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port, '0.0.0.0');
  logger.log(`TripNext API is running on http://localhost:${port}/api`);
  logger.log(`Health check available at http://localhost:${port}/api/health`);
}

bootstrap();
