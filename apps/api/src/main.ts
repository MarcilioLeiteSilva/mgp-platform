import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(AppConfigService);

  // 1. Prefixo Global da API REST (/api/v1)
  app.setGlobalPrefix('api/v1', {
    exclude: ['', '/', 'health/liveness', 'health/readiness'],
  });

  // 2. CORS (Habilitado para domínios da plataforma)
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // 3. Pipes, Filtros e Interceptores Globais
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformResponseInterceptor(),
  );

  // 4. Documentação Interativa OpenAPI / Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mobile Growth Platform (MGP) — Core API')
    .setDescription(
      'Documentação oficial e interativa da API central da plataforma MGP (SaaS, Inteligência, Ad Network e Monetização).',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Insira o Access Token JWT gerado no endpoint /auth/login',
      },
      'JWT-auth',
    )
    .addTag('Plataforma', 'Status e metadados gerais da API')
    .addTag('Saúde e Observabilidade', 'Probes de liveness e readiness')
    .addTag('Autenticação e Identidade', 'Cadastro, login, refresh tokens e sessões')
    .addTag('Organizações e Multi-Tenancy', 'Isolamento de tenants e gestão de membros')
    .addTag('Aplicativos e SDK', 'Gestão de apps, pacotes e chaves de integração')
    .addTag('Usuários', 'Perfis e configurações')
    .addTag('Administração Central (NOC)', 'Operações globais restritas')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // 5. Shutdown Hooks Gracioso
  app.enableShutdownHooks();

  const port = configService.port;
  await app.listen(port, '0.0.0.0');

  logger.log(`================================================================`);
  logger.log(`🚀 MGP Core API iniciada com sucesso em http://0.0.0.0:${port}`);
  logger.log(`📖 Documentação Swagger disponível em: /api/docs`);
  logger.log(`🩺 Health Probes: /health/liveness e /health/readiness`);
  logger.log(`================================================================`);
}

bootstrap();
