import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  const port = process.env.PORT_API || 3002;
  await app.listen(port);
  console.info(`MGP Core API inicializada na porta ${port}`);
}

bootstrap();
