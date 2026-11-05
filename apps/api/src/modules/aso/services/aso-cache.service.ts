import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import Redis, { Redis as RedisClient } from 'ioredis';
import { AppConfigService } from '../../../config/app-config.service';

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

@Injectable()
export class AsoCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsoCacheService.name);
  private client: RedisClient | null = null;
  private isConnected = false;
  private readonly memoryFallback = new Map<string, MemoryCacheEntry>();

  // TTLs padronizados para cache do ecossistema ASO (em segundos)
  public static readonly TTL = {
    APP: 86400, // 24 horas para metadados completos de aplicativo
    SEARCH: 21600, // 6 horas para resultados de busca por palavra-chave
    SUGGEST: 43200, // 12 horas para sugestões de autocomplete
    TOP_CHARTS: 14400, // 4 horas para top charts e rankings
    SIMILAR: 86400, // 24 horas para aplicativos similares
    DEVELOPER: 86400, // 24 horas para portfólio de desenvolvedor
    CATEGORIES: 604800, // 7 dias para catálogo de categorias da loja
  } as const;

  constructor(private readonly configService: AppConfigService) {
    this.initRedisClient();
  }

  private initRedisClient() {
    try {
      const redisUrl =
        this.configService.get('REDIS_URL') || process.env.REDIS_URL;

      if (!redisUrl) {
        this.logger.warn(
          'REDIS_URL não configurada. AsoCacheService operando em modo fallback em memória.',
        );
        return;
      }

      this.client = new Redis(redisUrl, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 3) return null; // Não trava o processo em loop infinito
          return Math.min(times * 1000, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Conexão Redis estabelecida com sucesso para AsoCacheService.');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(
          `Falha de conexão com Redis (${err.message}). Operando em modo de degradação suave.`,
        );
      });

      this.client.on('close', () => {
        this.isConnected = false;
      });
    } catch (err: any) {
      this.logger.warn(
        `Erro ao instanciar cliente Redis: ${err.message}. Degradação para memória ativa.`,
      );
      this.client = null;
      this.isConnected = false;
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.client) {
      try {
        await this.client.connect();
        this.isConnected = true;
      } catch (err: any) {
        this.isConnected = false;
        this.logger.warn(
          `Não foi possível conectar ao Redis na inicialização (${err.message}). Degradação graciosa em memória ativa.`,
        );
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        // Ignora erros no shutdown
      }
      this.client = null;
      this.isConnected = false;
    }
    this.memoryFallback.clear();
  }

  /**
   * Status de conectividade com o cluster/servidor Redis
   */
  isHealthy(): boolean {
    return this.isConnected;
  }

  /**
   * Busca um item serializado no cache.
   * Se o Redis estiver indisponível, busca de forma transparente no fallback em memória.
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.isConnected && this.client) {
      try {
        const raw = await this.client.get(key);
        if (raw) {
          return JSON.parse(raw) as T;
        }
        return null;
      } catch (err: any) {
        this.logger.warn(
          `Falha ao ler chave "${key}" do Redis: ${err.message}. Verificando fallback em memória.`,
        );
      }
    }

    // Fallback gracioso em memória
    const entry = this.memoryFallback.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }

    try {
      return JSON.parse(entry.value) as T;
    } catch {
      this.memoryFallback.delete(key);
      return null;
    }
  }

  /**
   * Salva um item com tempo de vida definido (TTL em segundos).
   * Persiste tanto no Redis quanto no fallback em memória para máxima resiliência.
   */
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);

    // Salva no fallback em memória
    this.memoryFallback.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      } catch (err: any) {
        this.logger.warn(
          `Falha ao salvar chave "${key}" no Redis: ${err.message}. Persistência mantida em memória.`,
        );
      }
    }
  }

  /**
   * Remove uma chave específica do cache.
   */
  async del(key: string): Promise<void> {
    this.memoryFallback.delete(key);

    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (err: any) {
        this.logger.warn(`Falha ao remover chave "${key}" do Redis: ${err.message}`);
      }
    }
  }

  /**
   * Invalida chaves que correspondam a um padrão (ex: 'aso:cache:app:*')
   */
  async resetPattern(pattern: string): Promise<number> {
    let deletedCount = 0;

    // Limpa memória
    const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    for (const key of Array.from(this.memoryFallback.keys())) {
      if (regexPattern.test(key)) {
        this.memoryFallback.delete(key);
        deletedCount++;
      }
    }

    // Limpa Redis via SCAN
    if (this.isConnected && this.client) {
      try {
        const stream = this.client.scanStream({
          match: pattern,
          count: 100,
        });

        for await (const keys of stream as any) {
          if (keys && keys.length) {
            const pipeline = this.client.pipeline();
            keys.forEach((k: string) => pipeline.del(k));
            await pipeline.exec();
            deletedCount += keys.length;
          }
        }
      } catch (err: any) {
        this.logger.warn(
          `Falha ao resetar chaves com padrão "${pattern}" no Redis: ${err.message}`,
        );
      }
    }

    return deletedCount;
  }

  // Métodos utilitários de geração padronizada de chaves
  buildAppKey(appId: string, country = 'us', lang = 'en'): string {
    return `aso:cache:app:${appId.trim().toLowerCase()}:${country.trim().toLowerCase()}:${lang.trim().toLowerCase()}`;
  }

  buildSearchKey(term: string, country = 'us', lang = 'en', num = 20): string {
    return `aso:cache:search:${encodeURIComponent(term.trim().toLowerCase())}:${country.trim().toLowerCase()}:${lang.trim().toLowerCase()}:${num}`;
  }

  buildSuggestKey(term: string, country = 'us', lang = 'en'): string {
    return `aso:cache:suggest:${encodeURIComponent(term.trim().toLowerCase())}:${country.trim().toLowerCase()}:${lang.trim().toLowerCase()}`;
  }

  buildTopChartsKey(
    category = 'APPLICATION',
    collection = 'TOP_FREE',
    country = 'us',
    lang = 'en',
    num = 50,
  ): string {
    return `aso:cache:top:${category.trim().toUpperCase()}:${collection.trim().toUpperCase()}:${country.trim().toLowerCase()}:${lang.trim().toLowerCase()}:${num}`;
  }

  buildSimilarKey(appId: string, country = 'us', lang = 'en'): string {
    return `aso:cache:similar:${appId.trim().toLowerCase()}:${country.trim().toLowerCase()}:${lang.trim().toLowerCase()}`;
  }

  buildDeveloperKey(
    devId: string,
    country = 'us',
    lang = 'en',
    num = 50,
  ): string {
    return `aso:cache:dev:${encodeURIComponent(devId.trim().toLowerCase())}:${country.trim().toLowerCase()}:${lang.trim().toLowerCase()}:${num}`;
  }

  buildCategoriesKey(): string {
    return 'aso:cache:categories';
  }
}

