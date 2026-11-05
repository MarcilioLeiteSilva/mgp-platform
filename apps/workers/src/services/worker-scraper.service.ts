export interface RawPlayAppResult {
  appId: string;
  title: string;
  summary?: string;
  description?: string;
  developer: string;
  developerId?: string;
  score: number;
  ratings?: number;
  reviews?: number;
  installs?: string;
  minInstalls?: number;
  maxInstalls?: number;
  free: boolean;
  price: number;
  genre: string;
  genreId: string;
  icon: string;
  screenshots: string[];
  url: string;
  [key: string]: any;
}

export class WorkerScraperService {
  private scraperClient: any = null;

  /**
   * Permite injetar um cliente mockado para testes unitários.
   */
  setScraperClient(client: any): void {
    this.scraperClient = client;
  }

  /**
   * Carrega dinamicamente google-play-scraper (ESM nativo).
   */
  private async getScraper(): Promise<any> {
    if (this.scraperClient) {
      return this.scraperClient;
    }

    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      const mod = await dynamicImport('google-play-scraper');
      this.scraperClient = mod.default || mod;
      return this.scraperClient;
    } catch {
      try {
        const mod = require('google-play-scraper');
        this.scraperClient = mod.default || mod;
        return this.scraperClient;
      } catch (err: any) {
        console.error(`[WorkerScraperService] Erro ao carregar google-play-scraper: ${err.message}`);
        throw err;
      }
    }
  }

  /**
   * Executa operação com retry e backoff exponencial em caso de erro 429 ou 503.
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, label: string, maxRetries = 2): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await fn();
      } catch (err: any) {
        attempt++;
        const isTransient =
          err.status === 429 ||
          err.status === 503 ||
          (err.message && (err.message.includes('429') || err.message.includes('503')));

        if (attempt <= maxRetries && isTransient) {
          const backoffMs = attempt * 1000 + Math.floor(Math.random() * 500);
          console.warn(`[WorkerScraperService] ${label} falhou (tentativa ${attempt}/${maxRetries}). Backoff: ${backoffMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Obtém os metadados de um app da Google Play Store.
   */
  async getApp(appId: string, country = 'br', lang = 'pt'): Promise<RawPlayAppResult> {
    const cleanAppId = appId.trim();
    const gplay = await this.getScraper();

    return this.executeWithRetry(
      () => gplay.app({ appId: cleanAppId, country, lang }),
      `getApp:${cleanAppId}`,
    );
  }

  /**
   * Busca pelo app no ranking orgânico de uma palavra-chave (top 100).
   * Retorna o rank (1-100) ou null se não estiver entre os 100 primeiros.
   */
  async searchAppRank(
    keyword: string,
    targetAppId: string,
    country = 'br',
    lang = 'pt',
    num = 100,
  ): Promise<number | null> {
    const cleanKeyword = keyword.trim();
    const cleanTarget = targetAppId.trim().toLowerCase();
    const gplay = await this.getScraper();

    const results: any[] = await this.executeWithRetry(
      () =>
        gplay.search({
          term: cleanKeyword,
          num: Math.min(Math.max(num, 1), 100),
          country,
          lang,
        }),
      `searchRank:${cleanKeyword}:${cleanTarget}`,
    );

    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }

    const index = results.findIndex((item) => (item.appId || '').toLowerCase() === cleanTarget);
    return index >= 0 ? index + 1 : null;
  }
}

