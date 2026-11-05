import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlayScraperEngineService } from './play-scraper-engine.service';
import { AsoCacheService } from './aso-cache.service';
import { AsoRateLimiterService } from './aso-rate-limiter.service';
import { PlayCollection } from '../types/google-play.types';

describe('PlayScraperEngineService (Motor de Coleta e Normalização Google Play)', () => {
  let service: PlayScraperEngineService;
  let cacheService: AsoCacheService;
  let rateLimiter: AsoRateLimiterService;

  const mockGplay: any = {
    app: jest.fn(),
    search: jest.fn(),
    suggest: jest.fn(),
    list: jest.fn(),
    similar: jest.fn(),
    developer: jest.fn(),
    category: {
      APPLICATION: 'APPLICATION',
      GAME: 'GAME',
      FINANCE: 'FINANCE',
      PRODUCTIVITY: 'PRODUCTIVITY',
    },
    collection: {
      TOP_FREE: 'TOP_FREE',
      TOP_PAID: 'TOP_PAID',
      GROSSING: 'GROSSING',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayScraperEngineService,
        {
          provide: AsoCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            buildAppKey: jest.fn().mockReturnValue('aso:cache:app:test'),
            buildSearchKey: jest.fn().mockReturnValue('aso:cache:search:test'),
            buildSuggestKey: jest.fn().mockReturnValue('aso:cache:suggest:test'),
            buildTopChartsKey: jest.fn().mockReturnValue('aso:cache:top:test'),
            buildSimilarKey: jest.fn().mockReturnValue('aso:cache:similar:test'),
            buildDeveloperKey: jest.fn().mockReturnValue('aso:cache:dev:test'),
            buildCategoriesKey: jest.fn().mockReturnValue('aso:cache:categories'),
          },
        },
        {
          provide: AsoRateLimiterService,
          useValue: {
            execute: jest.fn().mockImplementation((fn: () => any) => fn()),
          },
        },
      ],
    }).compile();

    service = module.get<PlayScraperEngineService>(PlayScraperEngineService);
    cacheService = module.get<AsoCacheService>(AsoCacheService);
    rateLimiter = module.get<AsoRateLimiterService>(AsoRateLimiterService);

    // Injeta cliente mock diretamente no service
    service.setScraperClient(mockGplay);

    jest.clearAllMocks();
  });

  describe('getApp (Metadados de Aplicativo)', () => {
    it('deve retornar do cache quando houver Cache HIT', async () => {
      const cachedApp = { appId: 'com.whatsapp', title: 'WhatsApp Messenger' };
      (cacheService.get as jest.Mock).mockResolvedValue(cachedApp);

      const result = await service.getApp('com.whatsapp');

      expect(result).toEqual(cachedApp);
      expect(cacheService.get).toHaveBeenCalled();
      expect(mockGplay.app).not.toHaveBeenCalled();
    });

    it('deve coletar, normalizar e salvar no cache em caso de Cache MISS', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      mockGplay.app.mockResolvedValue({
        appId: 'com.whatsapp',
        title: 'WhatsApp Messenger',
        developer: 'WhatsApp LLC',
        score: 4.6,
        scoreText: '4.6',
        ratings: 150000000,
        reviews: 20000000,
        installs: '10,000,000,000+',
        minInstalls: 10000000000,
        maxInstalls: 15000000000,
        free: true,
        price: 0,
        genre: 'Communication',
        genreId: 'COMMUNICATION',
        icon: 'https://icon.url',
        screenshots: ['https://screen1.jpg'],
      });

      const result = await service.getApp('com.whatsapp', { country: 'br', lang: 'pt-BR' });

      expect(result.appId).toBe('com.whatsapp');
      expect(result.title).toBe('WhatsApp Messenger');
      expect(result.free).toBe(true);
      expect(result.minInstalls).toBe(10000000000);
      expect(result.screenshots).toHaveLength(1);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando o scraper retornar 404', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      const notFoundErr: any = new Error('App not found (404)');
      notFoundErr.status = 404;
      mockGplay.app.mockRejectedValue(notFoundErr);

      await expect(service.getApp('com.inexistente.app')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar BadRequestException se appId for vazio', async () => {
      await expect(service.getApp('  ')).rejects.toThrow(BadRequestException);
    });
  });

  describe('search (Busca por Palavra-Chave)', () => {
    it('deve retornar do cache em caso de HIT', async () => {
      const cached = [{ appId: 'com.app.search', title: 'App Search' }];
      (cacheService.get as jest.Mock).mockResolvedValue(cached);

      const result = await service.search('banco');
      expect(result).toEqual(cached);
      expect(mockGplay.search).not.toHaveBeenCalled();
    });

    it('deve coletar e normalizar resultados de busca', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      mockGplay.search.mockResolvedValue([
        {
          appId: 'com.nu.bank',
          title: 'Nubank',
          developer: 'Nu Pagamentos',
          score: 4.8,
          free: true,
          price: 0,
          icon: 'https://icon.png',
        },
      ]);

      const result = await service.search('nubank', { num: 10 });

      expect(result).toHaveLength(1);
      expect(result[0].appId).toBe('com.nu.bank');
      expect(result[0].title).toBe('Nubank');
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('deve rejeitar termo de busca vazio com BadRequestException', async () => {
      await expect(service.search('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('suggest (Autocomplete)', () => {
    it('deve retornar sugestões preditivas do cache ou do scraper', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      mockGplay.suggest.mockResolvedValue(['whatsapp', 'whatsapp web']);

      const result = await service.suggest('what');

      expect(result).toEqual(['whatsapp', 'whatsapp web']);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('deve rejeitar termo vazio com BadRequestException', async () => {
      await expect(service.suggest('   ')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTopCharts (Rankings e Coleções)', () => {
    it('deve coletar lista de rankings respeitando categoria e coleção', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      mockGplay.list.mockResolvedValue([
        {
          appId: 'com.top.free',
          title: 'Top Free App',
          developer: 'Dev Top',
          score: 4.5,
          free: true,
        },
      ]);

      const result = await service.getTopCharts({
        category: 'FINANCE',
        collection: PlayCollection.TOP_FREE,
        num: 20,
      });

      expect(result).toHaveLength(1);
      expect(result[0].appId).toBe('com.top.free');
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('getCategories (Catálogo de Categorias)', () => {
    it('deve listar categorias formatadas amigavelmente', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);

      const result = await service.getCategories();

      expect(result.length).toBeGreaterThan(0);
      const appCat = result.find((c) => c.id === 'APPLICATION');
      expect(appCat).toBeDefined();
      expect(appCat?.name).toBe('Application');
    });
  });

  describe('getSimilar (Aplicativos Similares)', () => {
    it('deve coletar similares para um appId', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      mockGplay.similar.mockResolvedValue([
        { appId: 'com.comp.app', title: 'Competitor App', free: true },
      ]);

      const result = await service.getSimilar('com.main.app');

      expect(result).toHaveLength(1);
      expect(result[0].appId).toBe('com.comp.app');
      expect(cacheService.set).toHaveBeenCalled();
    });
  });

  describe('getDeveloperApps (Portfólio de Desenvolvedor)', () => {
    it('deve coletar aplicativos de um desenvolvedor', async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);
      mockGplay.developer.mockResolvedValue([
        { appId: 'com.spotify.lite', title: 'Spotify Lite', free: true },
      ]);

      const result = await service.getDeveloperApps('Spotify AB');

      expect(result).toHaveLength(1);
      expect(result[0].appId).toBe('com.spotify.lite');
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
});
