import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Plataforma')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Status e metadados da API' })
  getRoot() {
    return {
      name: 'Mobile Growth Platform (MGP) — Core API',
      version: '0.1.0',
      status: 'online',
      docs: '/api/docs',
      health: {
        liveness: '/health/liveness',
        readiness: '/health/readiness',
      },
    };
  }
}

