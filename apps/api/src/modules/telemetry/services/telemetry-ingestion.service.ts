import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { TelemetryAntifraudService } from './telemetry-antifraud.service';
import { TelemetryQueueService } from './telemetry-queue.service';
import {
  TelemetryBatchDto,
  TelemetryResponseDto,
  TelemetryBatchJobPayload,
} from '@mgp/contracts';

@Injectable()
export class TelemetryIngestionService {
  private readonly logger = new Logger(TelemetryIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly antifraudService: TelemetryAntifraudService,
    private readonly queueService: TelemetryQueueService,
  ) {}

  /**
   * Processa e valida um lote de telemetria recebido do SDK Android.
   */
  async ingestBatch(
    batch: TelemetryBatchDto,
    clientIp?: string,
  ): Promise<TelemetryResponseDto> {
    const serverTime = new Date().toISOString();

    // 1. Resolução do aplicativo via SDK Key
    const app = await this.prisma.app.findUnique({
      where: { sdkKey: batch.sdkKey },
      select: {
        id: true,
        organizationId: true,
        status: true,
        packageName: true,
        sdkKey: true,
      },
    });

    if (!app) {
      this.logger.warn(`Tentativa de ingestão com SDK Key inválida: ${batch.sdkKey ? batch.sdkKey.slice(0, 8) : 'desconhecida'}`);
      throw new UnauthorizedException('SDK Key inválida ou não registrada na plataforma.');
    }

    if (app.status === 'SUSPENDED') {
      throw new UnauthorizedException('Aplicativo suspenso por violação de termos ou fraude.');
    }

    // 2. Validação antifraude por evento (HMAC, Nonce, Time Drift)
    const validEvents = [];
    let rejectedCount = 0;

    for (const event of batch.events) {
      // 2.1. Validação de Assinatura HMAC-SHA256
      const isSignatureValid = this.antifraudService.validateHmacSignature(event, app.sdkKey);
      if (!isSignatureValid) {
        this.logger.warn(`Assinatura HMAC inválida no evento ${event.eventId} (App: ${app.packageName})`);
        rejectedCount++;
        continue;
      }

      // 2.2. Validação de Janela Temporal
      const isTimeValid = this.antifraudService.validateTimestamp(event.timestamp);
      if (!isTimeValid) {
        this.logger.warn(`Desvio temporal inválido no evento ${event.eventId}: ${event.timestamp}`);
        rejectedCount++;
        continue;
      }

      // 2.3. Deduplicação de Nonce (Anti-Replay)
      const isNonceNew = await this.antifraudService.checkAndRecordNonce(event.nonce);
      if (!isNonceNew) {
        this.logger.warn(`Tentativa de Replay Attack detectada com Nonce repetido: ${event.nonce}`);
        rejectedCount++;
        continue;
      }

      validEvents.push(event);
    }

    // 3. Se nenhum evento for válido, retorna falha
    if (validEvents.length === 0 && batch.events.length > 0) {
      return {
        success: false,
        batchId: batch.batchId,
        processedCount: 0,
        rejectedCount,
        serverTime,
        error: 'Todos os eventos do lote foram rejeitados por falha de validação ou replay.',
      };
    }

    // 4. Enfileira lote filtrado para processamento assíncrono pelos workers
    const jobPayload: TelemetryBatchJobPayload = {
      batchId: batch.batchId,
      appId: app.id,
      organizationId: app.organizationId,
      sdkKey: app.sdkKey,
      clientIp,
      batch: {
        ...batch,
        events: validEvents,
      },
      receivedAt: serverTime,
    };

    await this.queueService.enqueueBatch(jobPayload);

    return {
      success: true,
      batchId: batch.batchId,
      processedCount: validEvents.length,
      rejectedCount,
      serverTime,
    };
  }
}

