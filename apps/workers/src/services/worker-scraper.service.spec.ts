import { WorkerScraperService } from './worker-scraper.service';

describe('WorkerScraperService (Scraper da Play Store no Worker)', () => {
  let service: WorkerScraperService;
  let mockScraper: any;

  beforeEach(() => {
    service = new WorkerScraperService();
    mockScraper = {
      app: jest.fn(),
      search: jest.fn(),
    };
    service.setScraperClient(mockScraper);
  });

  it('deve obter metadados do aplicativo com sucesso', async () => {
    mockScraper.app.mockResolvedValue({
      appId: 'com.nu.production',
      title: 'Nubank',
      score: 4.7,
      developer: 'Nu Pagamentos',
      screenshots: ['p1', 'p2'],
    });

    const result = await service.getApp('com.nu.production', 'br', 'pt');

    expect(result.appId).toBe('com.nu.production');
    expect(result.title).toBe('Nubank');
    expect(mockScraper.app).toHaveBeenCalledWith({
      appId: 'com.nu.production',
      country: 'br',
      lang: 'pt',
    });
  });

  it('searchAppRank - deve encontrar a posição 1-based quando app está no top 100', async () => {
    mockScraper.search.mockResolvedValue([
      { appId: 'com.competitor.app', title: 'Competidor' },
      { appId: 'com.other.app', title: 'Outro' },
      { appId: 'com.nu.production', title: 'Nubank' },
    ]);

    const rank = await service.searchAppRank('cartão de crédito', 'com.nu.production', 'br', 'pt');

    expect(rank).toBe(3);
    expect(mockScraper.search).toHaveBeenCalledWith({
      term: 'cartão de crédito',
      num: 100,
      country: 'br',
      lang: 'pt',
    });
  });

  it('searchAppRank - deve retornar null quando app não está no resultado da busca', async () => {
    mockScraper.search.mockResolvedValue([
      { appId: 'com.app.a', title: 'A' },
      { appId: 'com.app.b', title: 'B' },
    ]);

    const rank = await service.searchAppRank('termo qualquer', 'com.nu.production');
    expect(rank).toBeNull();
  });

  it('searchAppRank - deve retornar null quando a busca retorna lista vazia', async () => {
    mockScraper.search.mockResolvedValue([]);
    const rank = await service.searchAppRank('termo inexistente', 'com.nu.production');
    expect(rank).toBeNull();
  });
});

