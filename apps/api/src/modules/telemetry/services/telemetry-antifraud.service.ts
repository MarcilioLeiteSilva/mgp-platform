import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as crypto from 'crypto';
import IORedis from 'ioredis';
import { AppConfigService } from '../../../config/app-config.service';
import { TelemetryEventDto, DeviceContextDto } from '@mgp/contracts';

export interface AntifraudValidationResult {
  isValid: boolean;
  reason?: string;
  isReplay: boolean;
  isTampered: boolean;
  isTimeDrift: boolean;
}

@Injectable()
export class TelemetryAntifraudService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryAntifraudService.name);
  private redisClient: IORedis | null = null;
  private readonly memoryNonceCache = new Map<string, number>();

  constructor(private readonly config: AppConfigService) {}

  onModuleInit() {
    this.initRedis();
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.disconnect();
      this.redisClient = null;
    }
    this.memoryNonceCache.clear();
  }

  /**
   * Permite injetar um cliente Redis para testes unitários ou mocks.
   */
  setRedisClient(client: any): void {
    this.redisClient = client;
  }

  private initRedis() {
    try {
      this.redisClient = new IORedis(this.config.redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 100, 2000),
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Conexão Redis estabelecida com sucesso para TelemetryAntifraudService.');
      });

      this.redisClient.on('error', (err) => {
        this.logger.warn(`Falha de conexão com Redis no TelemetryAntifraud: ${err.message}. Degradação em memória.`);
      });
    } catch (err: any) {
      this.logger.warn(`Erro ao instanciar Redis para TelemetryAntifraud: ${err.message}. Operando em memória.`);
    }
  }

  /**
   * Valida a assinatura digital HMAC-SHA256 do evento.
   */
  validateHmacSignature(event: TelemetryEventDto, sdkKey: string): boolean {
    if (!event.signature || !event.nonce) {
      return false;
    }

    try {
      const canonicalString = `${event.eventId}|${event.eventType}|${event.sessionId}|${event.timestamp}|${event.nonce}`;
      const expectedHmac = crypto
        .createHmac('sha256', sdkKey)
        .update(canonicalString, 'utf-8')
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(event.signature, 'hex'),
        Buffer.from(expectedHmac, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Verifica se o timestamp do evento está dentro de uma janela razoável
   * (não mais de 24 horas no passado e não mais de 5 minutos no futuro).
   */
  validateTimestamp(timestampStr: string): boolean {
    try {
      const eventTime = new Date(timestampStr).getTime();
      const now = Date.now();

      if (isNaN(eventTime)) return false;

      const maxFutureToleranceMs = 5 * 60 * 1000; // 5 minutos
      const maxPastToleranceMs = 24 * 60 * 60 * 1000; // 24 horas

      if (eventTime > now + maxFutureToleranceMs) return false;
      if (eventTime < now - maxPastToleranceMs) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deduplica o Nonce do evento para impedir Replay Attacks.
   * Retorna true se o Nonce é inédito e foi registrado; false se já foi consumido.
   */
  async checkAndRecordNonce(nonce: string, ttlSeconds: number = 600): Promise<boolean> {
    const key = `nonce:telemetry:${nonce}`;

    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const result = await this.redisClient.set(key, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch (err: any) {
        this.logger.warn(`Falha ao checar nonce no Redis (${err.message}). Utilizando fallback em memória.`);
      }
    }

    // Fallback em memória
    const now = Date.now();
    const existing = this.memoryNonceCache.get(key);
    if (existing && existing > now) {
      return false; // Replay detectado
    }

    this.memoryNonceCache.set(key, now + ttlSeconds * 1000);
    this.cleanExpiredMemoryNonces();
    return true;
  }

  /**
   * Analisa sinais de fraude no evento e contexto de dispositivo.
   */
  inspectFraudSignals(event: TelemetryEventDto, device: DeviceContextDto): { isSuspicious: boolean; flags: string[] } {
    const flags: string[] = [];

    if (device.isEmulator) {
      flags.push('EMULATOR_ENVIRONMENT');
    }

    if (device.isRooted) {
      flags.push('ROOTED_DEVICE');
    }

    if (device.isLimitAdTracking && device.advertisingId && device.advertisingId !== '00000000-0000-0000-0000-000000000000') {
      flags.push('NON_COMPLIANT_AD_ID');
    }

    return {
      isSuspicious: flags.length > 0,
      flags,
    };
  }

  private cleanExpiredMemoryNonces() {
    if (this.memoryNonceCache.size > 5000) {
      const now = Date.now();
      for (const [k, exp] of this.memoryNonceCache.entries()) {
        if (exp <= now) {
          this.memoryNonceCache.delete(k);
        }
      }
    }
  }
}

