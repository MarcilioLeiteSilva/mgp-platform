import IORedis from 'ioredis';

export class CacheService {
  private redis: IORedis | null = null;
  private readonly memoryCache = new Map<string, { value: any; expiresAt: number }>();
  private readonly memoryNonces = new Set<string>();
  private isConnected = false;

  constructor(private readonly redisUrl: string) {
    this.initRedis();
  }

  private initRedis(): void {
    try {
      this.redis = new IORedis(this.redisUrl, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        connectTimeout: 2000,
        lazyConnect: true,
        retryStrategy(times) {
          return Math.min(times * 100, 3000);
        },
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
      });

      this.redis.on('error', () => {
        this.isConnected = false;
      });

      // Conexão em background sem bloquear o construtor
      this.redis.connect().catch(() => {
        this.isConnected = false;
      });
    } catch {
      this.isConnected = false;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Deduplicação atômica de Nonce para proteção contra Replay Attack.
   * Retorna true se o nonce for novo e aceito; false se já foi consumido.
   */
  async checkAndRecordNonce(nonce: string, ttlSeconds = 600): Promise<boolean> {
    const key = `nonce:adserver:${nonce}`;

    if (this.redis && this.isConnected) {
      try {
        const result = await this.redis.set(key, '1', 'EX', ttlSeconds, 'NX');
        return result === 'OK';
      } catch {
        // Fallback em memória
      }
    }

    // Fallback defensivo em memória
    if (this.memoryNonces.has(nonce)) {
      return false;
    }

    this.memoryNonces.add(nonce);
    if (this.memoryNonces.size > 20000) {
      const firstEntry = this.memoryNonces.values().next().value;
      if (firstEntry) this.memoryNonces.delete(firstEntry);
    }

    setTimeout(() => {
      this.memoryNonces.delete(nonce);
    }, ttlSeconds * 1000);

    return true;
  }

  /**
   * Obtém item do cache (Redis com fallback em memória)
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.redis && this.isConnected) {
      try {
        const data = await this.redis.get(key);
        if (data) {
          return JSON.parse(data) as T;
        }
      } catch {
        // Fallback em memória
      }
    }

    const memItem = this.memoryCache.get(key);
    if (memItem) {
      if (Date.now() > memItem.expiresAt) {
        this.memoryCache.delete(key);
        return null;
      }
      return memItem.value as T;
    }

    return null;
  }

  /**
   * Define item no cache com TTL
   */
  async set<T>(key: string, value: T, ttlSeconds = 60): Promise<void> {
    if (this.redis && this.isConnected) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch {
        // Ignora falha de Redis e persiste em memória
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    if (this.memoryCache.size > 10000) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) this.memoryCache.delete(oldestKey);
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        this.redis.disconnect();
      }
      this.isConnected = false;
    }
    this.memoryCache.clear();
    this.memoryNonces.clear();
  }
}
