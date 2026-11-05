import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AsoCacheService } from './aso-cache.service';
import { AsoRateLimiterService } from './aso-rate-limiter.service';
import {
  PlayAppMetadata,
  PlayAppOptions,
  PlayCategoryItem,
  PlayCollection,
  PlayDeveloperOptions,
  PlaySearchOptions,
  PlaySearchResultItem,
  PlaySuggestOptions,
  PlayTopChartsOptions,
} from '../types/google-play.types';

@Injectable()
export class PlayScraperEngineService {
  private readonly logger = new Logger(PlayScraperEngineService.name);
  private scraperClient: any = null;

  constructor(
    private readonly cacheService: AsoCacheService,
    private readonly rateLimiter: AsoRateLimiterService,
  ) {}

  /**
   * Permite injetar uma instância mockada ou customizada do scraper (essencial para testes unitários).
   */
  setScraperClient(client: any): void {
    this.scraperClient = client;
  }

  /**
   * Carrega dinamicamente o pacote google-play-scraper (módulo ESM nativo em ambiente CJS).
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
        // Fallback para ambientes em que require funcione
        const mod = require('google-play-scraper');
        this.scraperClient = mod.default || mod;
        return this.scraperClient;
      } catch (err: any) {
        this.logger.error(`Falha ao carregar o engine google-play-scraper: ${err.message}`);
        throw err;
      }
    }
  }

  /**
   * Obtém metadados completos de um aplicativo a partir de seu package name (ex: com.whatsapp).
   */
  async getApp(
    appId: string,
    options: PlayAppOptions = {},
  ): Promise<PlayAppMetadata> {
    const cleanAppId = appId.trim();
    if (!cleanAppId) {
      throw new BadRequestException('O parâmetro appId é obrigatório.');
    }

    const country = options.country || 'us';
    const lang = options.lang || 'en';
    const cacheKey = this.cacheService.buildAppKey(cleanAppId, country, lang);

    // 1. Verificação no cache
    const cached = await this.cacheService.get<PlayAppMetadata>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache HIT para aplicativo: ${cleanAppId}`);
      return cached;
    }

    // 2. Coleta via scraper com rate limiter e backoff
    const gplay = await this.getScraper();
    let rawApp: any;
    try {
      rawApp = await this.rateLimiter.execute(
        () =>
          gplay.app({
            appId: cleanAppId,
            country,
            lang,
          }),
        `getApp:${cleanAppId}`,
      );
    } catch (err: any) {
      if (
        err.status === 404 ||
        (err.message && err.message.toLowerCase().includes('not found')) ||
        (err.message && err.message.includes('404'))
      ) {
        throw new NotFoundException(
          `Aplicativo "${cleanAppId}" não foi encontrado na Google Play Store.`,
        );
      }
      this.logger.error(`Erro ao obter app ${cleanAppId}: ${err.message}`);
      throw err;
    }

    // 3. Normalização
    const normalized = this.normalizeAppMetadata(rawApp);

    // 4. Armazena no cache
    await this.cacheService.set(
      cacheKey,
      normalized,
      AsoCacheService.TTL.APP,
    );

    return normalized;
  }

  /**
   * Realiza busca textual de aplicativos por palavra-chave.
   */
  async search(
    term: string,
    options: PlaySearchOptions = {},
  ): Promise<PlaySearchResultItem[]> {
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      throw new BadRequestException('O termo de busca é obrigatório.');
    }

    const country = options.country || 'us';
    const lang = options.lang || 'en';
    const num = Math.min(Math.max(options.num || 20, 1), 100);
    const cacheKey = this.cacheService.buildSearchKey(cleanTerm, country, lang, num);

    // 1. Cache HIT
    const cached = await this.cacheService.get<PlaySearchResultItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Scraping com rate limit
    const gplay = await this.getScraper();
    let rawResults: any[];
    try {
      rawResults = await this.rateLimiter.execute(
        () =>
          gplay.search({
            term: cleanTerm,
            country,
            lang,
            num,
          }),
        `search:${cleanTerm}`,
      );
    } catch (err: any) {
      this.logger.error(`Erro na busca por "${cleanTerm}": ${err.message}`);
      throw err;
    }

    // 3. Normalização
    const normalized = (rawResults || []).map((item) =>
      this.normalizeSearchResult(item),
    );

    // 4. Salva no cache
    await this.cacheService.set(
      cacheKey,
      normalized,
      AsoCacheService.TTL.SEARCH,
    );

    return normalized;
  }

  /**
   * Consulta sugestões do autocomplete do Google Play para expansão de palavras-chave.
   */
  async suggest(
    term: string,
    options: PlaySuggestOptions = {},
  ): Promise<string[]> {
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      throw new BadRequestException('O termo para autocomplete é obrigatório.');
    }

    const country = options.country || 'us';
    const lang = options.lang || 'en';
    const cacheKey = this.cacheService.buildSuggestKey(cleanTerm, country, lang);

    // 1. Cache HIT
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Coleta via scraper
    const gplay = await this.getScraper();
    let suggestions: string[];
    try {
      suggestions = await this.rateLimiter.execute(
        () =>
          gplay.suggest({
            term: cleanTerm,
            country,
            lang,
          }),
        `suggest:${cleanTerm}`,
      );
    } catch (err: any) {
      this.logger.error(`Erro no autocomplete de "${cleanTerm}": ${err.message}`);
      throw err;
    }

    const result = suggestions || [];

    // 3. Salva no cache
    await this.cacheService.set(
      cacheKey,
      result,
      AsoCacheService.TTL.SUGGEST,
    );

    return result;
  }

  /**
   * Obtém rankings e top charts (Top Free, Top Paid, Grossing) por categoria.
   */
  async getTopCharts(
    options: PlayTopChartsOptions = {},
  ): Promise<PlaySearchResultItem[]> {
    const category = options.category || 'APPLICATION';
    const collection = options.collection || PlayCollection.TOP_FREE;
    const country = options.country || 'us';
    const lang = options.lang || 'en';
    const num = Math.min(Math.max(options.num || 50, 1), 100);

    const cacheKey = this.cacheService.buildTopChartsKey(
      category,
      collection,
      country,
      lang,
      num,
    );

    // 1. Cache HIT
    const cached = await this.cacheService.get<PlaySearchResultItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Scraping
    const gplay = await this.getScraper();
    const gplayCollection = gplay.collection?.[collection] || collection;
    const gplayCategory =
      gplay.category?.[category.toUpperCase()] || category.toUpperCase();

    let rawList: any[];
    try {
      rawList = await this.rateLimiter.execute(
        () =>
          gplay.list({
            category: gplayCategory,
            collection: gplayCollection,
            country,
            lang,
            num,
          }),
        `topCharts:${category}:${collection}`,
      );
    } catch (err: any) {
      this.logger.error(`Erro ao obter top charts: ${err.message}`);
      throw err;
    }

    // 3. Normalização
    const normalized = (rawList || []).map((item) =>
      this.normalizeSearchResult(item),
    );

    // 4. Salva no cache
    await this.cacheService.set(
      cacheKey,
      normalized,
      AsoCacheService.TTL.TOP_CHARTS,
    );

    return normalized;
  }

  /**
   * Lista todas as categorias suportadas na Google Play Store.
   */
  async getCategories(): Promise<PlayCategoryItem[]> {
    const cacheKey = this.cacheService.buildCategoriesKey();

    // 1. Cache HIT
    const cached = await this.cacheService.get<PlayCategoryItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Categorias do SDK do google-play-scraper
    const gplay = await this.getScraper();
    const catMap = gplay.category || {};
    const categories: PlayCategoryItem[] = Object.keys(catMap).map((key) => ({
      id: key,
      name: this.formatCategoryName(key),
    }));

    // Se por alguma razão o mapa for vazio, categorias padrão essenciais
    if (categories.length === 0) {
      categories.push(
        { id: 'APPLICATION', name: 'Applications' },
        { id: 'GAME', name: 'Games' },
        { id: 'FINANCE', name: 'Finance' },
        { id: 'PRODUCTIVITY', name: 'Productivity' },
        { id: 'SHOPPING', name: 'Shopping' },
        { id: 'SOCIAL', name: 'Social' },
      );
    }

    // 3. Salva no cache
    await this.cacheService.set(
      cacheKey,
      categories,
      AsoCacheService.TTL.CATEGORIES,
    );

    return categories;
  }

  /**
   * Lista aplicativos similares e concorrentes diretos a um aplicativo.
   */
  async getSimilar(
    appId: string,
    options: PlayAppOptions = {},
  ): Promise<PlaySearchResultItem[]> {
    const cleanAppId = appId.trim();
    if (!cleanAppId) {
      throw new BadRequestException('O appId é obrigatório.');
    }

    const country = options.country || 'us';
    const lang = options.lang || 'en';
    const cacheKey = this.cacheService.buildSimilarKey(cleanAppId, country, lang);

    // 1. Cache HIT
    const cached = await this.cacheService.get<PlaySearchResultItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Scraping
    const gplay = await this.getScraper();
    let rawList: any[];
    try {
      rawList = await this.rateLimiter.execute(
        () =>
          gplay.similar({
            appId: cleanAppId,
            country,
            lang,
          }),
        `similar:${cleanAppId}`,
      );
    } catch (err: any) {
      this.logger.error(`Erro ao obter similares para ${cleanAppId}: ${err.message}`);
      throw err;
    }

    // 3. Normalização
    const normalized = (rawList || []).map((item) =>
      this.normalizeSearchResult(item),
    );

    // 4. Salva no cache
    await this.cacheService.set(
      cacheKey,
      normalized,
      AsoCacheService.TTL.SIMILAR,
    );

    return normalized;
  }

  /**
   * Lista aplicativos publicados por um desenvolvedor específico.
   */
  async getDeveloperApps(
    devId: string,
    options: PlayDeveloperOptions = {},
  ): Promise<PlaySearchResultItem[]> {
    const cleanDevId = devId.trim();
    if (!cleanDevId) {
      throw new BadRequestException('O identificador do desenvolvedor é obrigatório.');
    }

    const country = options.country || 'us';
    const lang = options.lang || 'en';
    const num = Math.min(Math.max(options.num || 50, 1), 100);
    const cacheKey = this.cacheService.buildDeveloperKey(
      cleanDevId,
      country,
      lang,
      num,
    );

    // 1. Cache HIT
    const cached = await this.cacheService.get<PlaySearchResultItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 2. Scraping
    const gplay = await this.getScraper();
    let rawList: any[];
    try {
      rawList = await this.rateLimiter.execute(
        () =>
          gplay.developer({
            devId: cleanDevId,
            country,
            lang,
            num,
          }),
        `developer:${cleanDevId}`,
      );
    } catch (err: any) {
      this.logger.error(
        `Erro ao obter apps do desenvolvedor "${cleanDevId}": ${err.message}`,
      );
      throw err;
    }

    // 3. Normalização
    const normalized = (rawList || []).map((item) =>
      this.normalizeSearchResult(item),
    );

    // 4. Salva no cache
    await this.cacheService.set(
      cacheKey,
      normalized,
      AsoCacheService.TTL.DEVELOPER,
    );

    return normalized;
  }

  // --- Normalizadores de Metadados ---

  private normalizeAppMetadata(raw: any): PlayAppMetadata {
    return {
      appId: raw.appId || '',
      title: raw.title || '',
      summary: raw.summary || '',
      description: raw.description || '',
      developer: raw.developer || '',
      developerId: raw.developerId || undefined,
      developerEmail: raw.developerEmail || undefined,
      developerWebsite: raw.developerWebsite || undefined,
      developerAddress: raw.developerAddress || undefined,
      score: Number(raw.score) || 0,
      scoreText: raw.scoreText || String(raw.score || 0),
      ratings: Number(raw.ratings) || 0,
      reviews: Number(raw.reviews) || 0,
      installs: raw.installs || '0+',
      minInstalls: Number(raw.minInstalls) || 0,
      maxInstalls: Number(raw.maxInstalls) || 0,
      free: Boolean(raw.free),
      price: Number(raw.price) || 0,
      currency: raw.currency || 'USD',
      priceText: raw.priceText || (raw.free ? 'Free' : `$${raw.price}`),
      offersIAP: Boolean(raw.offersIAP),
      size: raw.size || undefined,
      androidVersion: raw.androidVersion || undefined,
      androidVersionText: raw.androidVersionText || undefined,
      genre: raw.genre || raw.genreId || '',
      genreId: raw.genreId || '',
      icon: raw.icon || '',
      headerImage: raw.headerImage || undefined,
      screenshots: Array.isArray(raw.screenshots) ? raw.screenshots : [],
      video: raw.video || undefined,
      videoImage: raw.videoImage || undefined,
      contentRating: raw.contentRating || undefined,
      adSupported: Boolean(raw.adSupported),
      released: raw.released || undefined,
      updated: raw.updated || undefined,
      version: raw.version || undefined,
      recentChanges: raw.recentChanges || undefined,
      url:
        raw.url ||
        `https://play.google.com/store/apps/details?id=${raw.appId}`,
    };
  }

  private normalizeSearchResult(raw: any): PlaySearchResultItem {
    return {
      appId: raw.appId || '',
      title: raw.title || '',
      summary: raw.summary || '',
      developer: raw.developer || '',
      developerId: raw.developerId || undefined,
      score: Number(raw.score) || 0,
      scoreText: raw.scoreText || String(raw.score || 0),
      priceText: raw.priceText || (raw.free ? 'Free' : `$${raw.price}`),
      free: Boolean(raw.free),
      icon: raw.icon || '',
      installs: raw.installs || undefined,
      currency: raw.currency || 'USD',
      price: Number(raw.price) || 0,
      genre: raw.genre || undefined,
      genreId: raw.genreId || undefined,
      url:
        raw.url ||
        `https://play.google.com/store/apps/details?id=${raw.appId}`,
    };
  }

  private formatCategoryName(key: string): string {
    return key
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
