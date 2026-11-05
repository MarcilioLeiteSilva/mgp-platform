import { PrismaClient } from '@mgp/database';
import { RedisOptions } from 'ioredis';

let prismaInstance: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prismaInstance;
}

export function getRedisConnectionOptions(): RedisOptions {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  return {
    maxRetriesPerRequest: null, // Obrigatório para BullMQ
    enableReadyCheck: false,
    retryStrategy(times: number) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    },
  };
}

export function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

export const WORKER_CONFIG = {
  CONCURRENCY: parseInt(process.env.WORKER_CONCURRENCY || '3', 10),
  RATE_LIMIT_MAX: parseInt(process.env.WORKER_RATE_LIMIT_MAX || '5', 10),
  RATE_LIMIT_DURATION_MS: 1000,
  DEFAULT_JOB_ATTEMPTS: 3,
  DEFAULT_BACKOFF_DELAY_MS: 2000,
  PACING_BETWEEN_BATCH_JOBS_MS: 300,
  ENABLE_CRON: process.env.ENABLE_WORKER_CRON !== 'false',
} as const;

