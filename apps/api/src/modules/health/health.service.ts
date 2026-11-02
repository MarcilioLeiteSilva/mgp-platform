import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppConfigService } from '../../config/app-config.service';
import Redis from 'ioredis';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  uptime: number;
  checks: {
    postgres: { status: 'up' | 'down'; latencyMs?: number; error?: string };
    redis: { status: 'up' | 'down'; latencyMs?: number; error?: string };
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  getLiveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {
      postgres: { status: 'down' },
      redis: { status: 'down' },
    };

    // 1. Verificação do PostgreSQL
    const pgStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.postgres = {
        status: 'up',
        latencyMs: Date.now() - pgStart,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na conexão com Postgres';
      checks.postgres = { status: 'down', error: errorMsg };
      this.logger.warn(`PostgreSQL probe failed: ${errorMsg}`);
    }

    // 2. Verificação do Redis
    const redisStart = Date.now();
    try {
      const redisUrl = this.config.get('REDIS_URL');
      const client = new Redis(redisUrl, {
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
      await client.connect();
      const ping = await client.ping();
      await client.quit();

      if (ping === 'PONG') {
        checks.redis = {
          status: 'up',
          latencyMs: Date.now() - redisStart,
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Falha na conexão com Redis';
      checks.redis = { status: 'down', error: errorMsg };
      this.logger.warn(`Redis probe failed: ${errorMsg}`);
    }

    const isAllUp = checks.postgres.status === 'up' && checks.redis.status === 'up';
    const isAnyUp = checks.postgres.status === 'up' || checks.redis.status === 'up';

    return {
      status: isAllUp ? 'ok' : isAnyUp ? 'degraded' : 'down',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    };
  }
}

