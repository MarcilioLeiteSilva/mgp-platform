import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { TelemetryIngestionService } from '../services/telemetry-ingestion.service';
import { TelemetryQueueService } from '../services/telemetry-queue.service';
import { Public } from '../../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperadminGuard } from '../../../common/guards/superadmin.guard';
import { TelemetryBatchSchema, TelemetryBatchDto, TelemetryResponseDto } from '@mgp/contracts';

@ApiTags('Telemetria e Métricas do SDK')
@Controller('telemetry')
export class TelemetryController {
  constructor(
    private readonly ingestionService: TelemetryIngestionService,
    private readonly queueService: TelemetryQueueService,
  ) {}

  @Public()
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Recebe lote de eventos de telemetria emitidos pelo SDK Android',
    description: 'Valida autenticidade criptográfica (HMAC-SHA256), proteção contra replay (Nonce) e enfileira para ingestão assíncrona.',
  })
  @ApiHeader({
    name: 'X-SDK-Key',
    required: false,
    description: 'Chave do aplicativo (opcional se fornecida no corpo)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lote recebido e validado com sucesso.',
  })
  @ApiResponse({
    status: 401,
    description: 'SDK Key inválida, revogada ou aplicativo suspenso.',
  })
  async ingestBatch(
    @Body() rawBody: any,
    @Req() req: any,
    @Headers('x-sdk-key') headerSdkKey?: string,
  ): Promise<TelemetryResponseDto> {
    const payload = {
      ...rawBody,
      sdkKey: rawBody.sdkKey || headerSdkKey,
    };

    // Validação estrita via Zod Schema
    const validatedBatch = TelemetryBatchSchema.parse(payload);
    const clientIp = req.ip || req.connection?.remoteAddress;

    return this.ingestionService.ingestBatch(validatedBatch, clientIp);
  }

  @UseGuards(JwtAuthGuard, SuperadminGuard)
  @Get('metrics')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Obtém métricas operacionais e contagens da fila de telemetria (NOC)',
    description: 'Retorna contagem de jobs esperando, ativos, completos e com falha na fila queue-telemetry.',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas da fila retornadas com sucesso.',
  })
  async getQueueMetrics() {
    return this.queueService.getMetrics();
  }
}

