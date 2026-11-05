import { Test, TestingModule } from '@nestjs/testing';
import { PlayScraperController } from './play-scraper.controller';
import { PlayScraperEngineService } from '../services/play-scraper-engine.service';
import { PlayCollection } from '../types/google-play.types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';

describe('PlayScraperController (Endpoints REST do Motor de Scraping Google Play)', () => {
  let controller: PlayScraperController;
  let scraperService: PlayScraperEngineService;

  const mockMetadata = {
    appId: 'com.whatsapp',
    title: 'WhatsApp Messenger',
    developer: 'WhatsApp LLC',
    score: 4.6,
    free: true,
    price: 0,
    minInstalls: 5000000000,
    maxInstalls: 10000000000,
    genre: 'Communication',
    genreId: 'COMMUNICATION',
    icon: 'https://icon.png',
    screenshots: [],
    adSupported: false,
    url: 'https://play.google.com/store/apps/details?id=com.whatsapp',
  };

  const mockSearchResult = [
    {
      appId: 'com.whatsapp',
      title: 'WhatsApp Messenger',
      developer: 'WhatsApp LLC',
      score: 4.6,
      free: true,
      price: 0,
      icon: 'https://icon.png',
      url: 'https://play.google.com/store/apps/details?id=com.whatsapp',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayScraperController],
      providers: [
        {
          provide: PlayScraperEngineService,
          useValue: {
            getApp: jest.fn().mockResolvedValue(mockMetadata),
            search: jest.fn().mockResolvedValue(mockSearchResult),
            suggest: jest.fn().mockResolvedValue(['whatsapp', 'whatsapp web']),
            getTopCharts: jest.fn().mockResolvedValue(mockSearchResult),
            getCategories: jest.fn().mockResolvedValue([
              { id: 'APPLICATION', name: 'Application' },
              { id: 'FINANCE', name: 'Finance' },
            ]),
            getSimilar: jest.fn().mockResolvedValue(mockSearchResult),
            getDeveloperApps: jest.fn().mockResolvedValue(mockSearchResult),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlayScraperController>(PlayScraperController);
    scraperService = module.get<PlayScraperEngineService>(
      PlayScraperEngineService,
    );
  });

  it('deve ser instanciado corretamente', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /aso/scraper/app/:appId', () => {
    it('deve delegar a busca de metadados para o engine de scraping', async () => {
      const result = await controller.getApp('com.whatsapp', {
        country: 'br',
        lang: 'pt-BR',
      });

      expect(result).toEqual(mockMetadata);
      expect(scraperService.getApp).toHaveBeenCalledWith('com.whatsapp', {
        country: 'br',
        lang: 'pt-BR',
      });
    });
  });

  describe('GET /aso/scraper/search', () => {
    it('deve pesquisar aplicativos por keyword com filtros', async () => {
      const result = await controller.search({
        term: 'finanças',
        country: 'br',
        lang: 'pt-BR',
        num: 15,
      });

      expect(result).toEqual(mockSearchResult);
      expect(scraperService.search).toHaveBeenCalledWith('finanças', {
        country: 'br',
        lang: 'pt-BR',
        num: 15,
      });
    });
  });

  describe('GET /aso/scraper/suggest', () => {
    it('deve obter sugestões do autocomplete para expansão de keywords', async () => {
      const result = await controller.suggest({
        term: 'what',
        country: 'br',
        lang: 'pt-BR',
      });

      expect(result).toEqual(['whatsapp', 'whatsapp web']);
      expect(scraperService.suggest).toHaveBeenCalledWith('what', {
        country: 'br',
        lang: 'pt-BR',
      });
    });
  });

  describe('GET /aso/scraper/top-charts', () => {
    it('deve consultar ranking por categoria e coleção', async () => {
      const result = await controller.getTopCharts({
        category: 'FINANCE',
        collection: PlayCollection.TOP_FREE,
        country: 'br',
        lang: 'pt-BR',
        num: 25,
      });

      expect(result).toEqual(mockSearchResult);
      expect(scraperService.getTopCharts).toHaveBeenCalledWith({
        category: 'FINANCE',
        collection: PlayCollection.TOP_FREE,
        country: 'br',
        lang: 'pt-BR',
        num: 25,
      });
    });
  });

  describe('GET /aso/scraper/categories', () => {
    it('deve listar todas as categorias do catálogo Play Store', async () => {
      const result = await controller.getCategories();

      expect(result).toHaveLength(2);
      expect(scraperService.getCategories).toHaveBeenCalled();
    });
  });

  describe('GET /aso/scraper/similar/:appId', () => {
    it('deve buscar concorrentes e aplicativos similares', async () => {
      const result = await controller.getSimilar('com.whatsapp', {
        country: 'br',
        lang: 'pt-BR',
      });

      expect(result).toEqual(mockSearchResult);
      expect(scraperService.getSimilar).toHaveBeenCalledWith('com.whatsapp', {
        country: 'br',
        lang: 'pt-BR',
      });
    });
  });

  describe('GET /aso/scraper/developer/:devId', () => {
    it('deve listar portfólio de apps de um desenvolvedor', async () => {
      const result = await controller.getDeveloperApps('WhatsApp LLC', {
        country: 'us',
        lang: 'en',
        num: 10,
      });

      expect(result).toEqual(mockSearchResult);
      expect(scraperService.getDeveloperApps).toHaveBeenCalledWith(
        'WhatsApp LLC',
        {
          country: 'us',
          lang: 'en',
          num: 10,
        },
      );
    });
  });
});

