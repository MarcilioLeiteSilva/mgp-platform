import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';

@ApiTags('Saúde e Observabilidade')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('liveness')
  @ApiOperation({ summary: 'Verifica se a aplicação está ativa (Liveness Probe)' })
  @ApiResponse({ status: 200, description: 'Aplicação ativa e respondendo ao event loop.' })
  getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Verifica conectividade com PostgreSQL e Redis (Readiness Probe)' })
  @ApiResponse({ status: 200, description: 'Todos os serviços dependentes estão operacionais.' })
  @ApiResponse({ status: 503, description: 'Serviço dependente (Postgres/Redis) indisponível.' })
  async getReadiness(@Res() res: Response) {
    const result = await this.healthService.getReadiness();
    const httpStatus =
      result.status === 'ok'
        ? HttpStatus.OK
        : result.status === 'degraded'
          ? HttpStatus.OK
          : HttpStatus.SERVICE_UNAVAILABLE;

    return res.status(httpStatus).json(result);
  }
}

