import { Test, TestingModule } from '@nestjs/testing';
import { AsoCacheService } from './aso-cache.service';
import { AppConfigService } from '../../../config/app-config.service';

describe('AsoCacheService (Cache Redis Resiliente e Fallback em Memória)', () => {
  let service: AsoCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsoCacheService,
        {
          provide: AppConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined), // Simula ausência de REDIS_URL para fallback
          },
        },
      ],
    }).compile();

    service = module.get<AsoCacheService>(AsoCacheService);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
    expect(service.isHealthy()).toBe(false); // Sem Redis configurado, opera em fallback
  });

  describe('Geradores de Chaves de Cache Padronizadas', () => {
    it('deve gerar chave canônica para metadados de app', () => {
      const key = service.buildAppKey('com.whatsapp', 'BR', 'pt-BR');
      expect(key).toBe('aso:cache:app:com.whatsapp:br:pt-br');
    });

    it('deve gerar chave canônica para busca por termo', () => {
      const key = service.buildSearchKey('banco digital', 'BR', 'pt-BR', 20);
      expect(key).toBe('aso:cache:search:banco%20digital:br:pt-br:20');
    });

    it('deve gerar chave canônica para autocomplete', () => {
      const key = service.buildSuggestKey('nubank', 'BR', 'pt-BR');
      expect(key).toBe('aso:cache:suggest:nubank:br:pt-br');
    });

    it('deve gerar chave canônica para top charts', () => {
      const key = service.buildTopChartsKey('FINANCE', 'TOP_FREE', 'BR', 'pt-BR', 50);
      expect(key).toBe('aso:cache:top:FINANCE:TOP_FREE:br:pt-br:50');
    });

    it('deve gerar chave canônica para aplicativos similares', () => {
      const key = service.buildSimilarKey('com.spotify.music', 'US', 'en');
      expect(key).toBe('aso:cache:similar:com.spotify.music:us:en');
    });

    it('deve gerar chave canônica para portfólio de desenvolvedor', () => {
      const key = service.buildDeveloperKey('Spotify AB', 'US', 'en', 30);
      expect(key).toBe('aso:cache:dev:spotify%20ab:us:en:30');
    });

    it('deve gerar chave canônica para categorias', () => {
      expect(service.buildCategoriesKey()).toBe('aso:cache:categories');
    });
  });

  describe('Operações de Leitura, Gravação e TTL (Fallback Graceful em Memória)', () => {
    it('deve salvar e recuperar um objeto serializado no cache', async () => {
      const key = 'aso:cache:test:item1';
      const payload = { appId: 'com.test.app', score: 4.8 };

      await service.set(key, payload, 60);
      const result = await service.get<typeof payload>(key);

      expect(result).toEqual(payload);
    });

    it('deve retornar null para chaves inexistentes', async () => {
      const result = await service.get('aso:cache:inexistente');
      expect(result).toBeNull();
    });

    it('deve remover chave com sucesso via del()', async () => {
      const key = 'aso:cache:test:item2';
      await service.set(key, { data: 'ok' }, 60);

      await service.del(key);
      const result = await service.get(key);
      expect(result).toBeNull();
    });

    it('deve expirar item após o TTL estipulado', async () => {
      const key = 'aso:cache:test:expiring';
      // Salva com TTL de 0 segundos (expira imediatamente)
      await service.set(key, { data: 'expired' }, -1);

      const result = await service.get(key);
      expect(result).toBeNull();
    });

    it('deve resetar chaves que coincidem com um padrão via resetPattern()', async () => {
      await service.set('aso:cache:app:com.app1:us:en', { id: 1 }, 60);
      await service.set('aso:cache:app:com.app2:us:en', { id: 2 }, 60);
      await service.set('aso:cache:search:term1:us:en:10', { id: 3 }, 60);

      const deleted = await service.resetPattern('aso:cache:app:*');
      expect(deleted).toBe(2);

      expect(await service.get('aso:cache:app:com.app1:us:en')).toBeNull();
      expect(await service.get('aso:cache:app:com.app2:us:en')).toBeNull();
      expect(await service.get('aso:cache:search:term1:us:en:10')).not.toBeNull();
    });
  });
});

