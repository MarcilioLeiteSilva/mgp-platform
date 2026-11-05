import { Injectable, Logger } from '@nestjs/common';

export interface RateLimiterMetrics {
  activeCount: number;
  queuedCount: number;
  totalExecuted: number;
  totalRetried: number;
  totalFailed: number;
}

@Injectable()
export class AsoRateLimiterService {
  private readonly logger = new Logger(AsoRateLimiterService.name);

  private maxConcurrency = 3;
  private minDelayMs = 150;
  private activeCount = 0;
  private lastRequestTimestamp = 0;
  private queue: Array<() => void> = [];

  // Métricas para observabilidade operacional
  private totalExecuted = 0;
  private totalRetried = 0;
  private totalFailed = 0;

  constructor() {}

  /**
   * Configuração dinâmica de concorrência e delay (útil em testes ou ajuste fino)
   */
  configure(options: { maxConcurrency?: number; minDelayMs?: number }): void {
    if (options.maxConcurrency !== undefined) {
      this.maxConcurrency = options.maxConcurrency;
    }
    if (options.minDelayMs !== undefined) {
      this.minDelayMs = options.minDelayMs;
    }
  }

  getMetrics(): RateLimiterMetrics {
    return {
      activeCount: this.activeCount,
      queuedCount: this.queue.length,
      totalExecuted: this.totalExecuted,
      totalRetried: this.totalRetried,
      totalFailed: this.totalFailed,
    };
  }

  /**
   * Executa uma função assíncrona sob controle estrito de concorrência,
   * espaçamento mínimo entre chamadas e retry exponencial em erros temporários.
   */
  async execute<T>(
    fn: () => Promise<T>,
    context = 'google-play-request',
    maxRetries = 3,
    baseBackoffMs = 500,
  ): Promise<T> {
    await this.acquireSlot();

    try {
      return await this.executeWithRetry(fn, context, maxRetries, baseBackoffMs);
    } finally {
      this.releaseSlot();
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeCount >= this.maxConcurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.activeCount++;

    // Garante delay mínimo entre o início das requisições para evitar picos na Google Play
    const now = Date.now();
    const elapsedSinceLast = now - this.lastRequestTimestamp;
    if (elapsedSinceLast < this.minDelayMs) {
      const waitTime = this.minDelayMs - elapsedSinceLast;
      await this.sleep(waitTime);
    }
    this.lastRequestTimestamp = Date.now();
  }

  private releaseSlot(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);

    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: string,
    maxRetries: number,
    baseBackoffMs: number,
  ): Promise<T> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const result = await fn();
        this.totalExecuted++;
        return result;
      } catch (err: any) {
        attempt++;

        // Se for 404 (App não encontrado) ou 400 (Bad request), não faz retry
        if (this.isNonRetryableError(err)) {
          this.totalFailed++;
          throw err;
        }

        if (attempt > maxRetries) {
          this.totalFailed++;
          this.logger.error(
            `[${context}] Esgotadas as ${maxRetries} tentativas de retry: ${err.message}`,
          );
          throw err;
        }

        this.totalRetried++;
        const jitter = Math.floor(Math.random() * 100);
        const backoffMs = baseBackoffMs * Math.pow(2, attempt - 1) + jitter;

        this.logger.warn(
          `[${context}] Tentativa ${attempt} falhou (${err.message}). Aplicando backoff de ${backoffMs}ms antes do retry.`,
        );

        await this.sleep(backoffMs);
      }
    }

    throw new Error(`[${context}] Falha inesperada no fluxo de retry.`);
  }

  private isNonRetryableError(err: any): boolean {
    if (!err) return false;

    const status = err.status || err.statusCode;
    if (status === 404 || status === 400) return true;

    const message = (err.message || '').toLowerCase();
    if (message.includes('not found') || message.includes('404')) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

