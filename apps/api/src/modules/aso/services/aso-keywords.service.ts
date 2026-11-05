import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PlayScraperEngineService } from './play-scraper-engine.service';
import { TrackKeywordDto } from '../dto';

@Injectable()
export class AsoKeywordsService {
  private readonly logger = new Logger(AsoKeywordsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: PlayScraperEngineService,
  ) {}

  /**
   * Adiciona e inicia o rastreamento diário de uma palavra-chave para o aplicativo monitorado.
   * Realiza a primeira consulta de posicionamento orgânico na Google Play Store.
   */
  async trackKeyword(
    organizationId: string,
    asoAppId: string,
    dto: TrackKeywordDto,
  ) {
    // 1. Valida isolamento de tenant
    const app = await this.prisma.asoApp.findFirst({
      where: { id: asoAppId, organizationId },
    });

    if (!app) {
      throw new NotFoundException('Aplicativo monitorado não encontrado.');
    }

    const cleanKeyword = dto.keyword.trim().toLowerCase();
    if (!cleanKeyword) {
      throw new BadRequestException('A palavra-chave não pode ser vazia.');
    }

    // 2. Busca ou cadastra o termo global de busca
    const keyword = await this.prisma.asoKeyword.upsert({
      where: {
        keyword_country_lang: {
          keyword: cleanKeyword,
          country: app.country,
          lang: app.lang,
        },
      },
      update: {},
      create: {
        keyword: cleanKeyword,
        country: app.country,
        lang: app.lang,
        searchVolume: 50, // Estimativa inicial
        difficulty: 40,
        relevance: 70,
        lastTrackedAt: new Date(),
      },
    });

    // 3. Verifica se a relação já existe
    const existingRelation = await this.prisma.asoAppKeyword.findUnique({
      where: {
        asoAppId_keywordId: {
          asoAppId: app.id,
          keywordId: keyword.id,
        },
      },
      include: { keyword: true },
    });

    if (existingRelation) {
      if (existingRelation.isActive) {
        throw new ConflictException(
          `A palavra-chave "${cleanKeyword}" já está ativa no monitoramento deste aplicativo.`,
        );
      }

      // Reativa keyword
      return this.prisma.asoAppKeyword.update({
        where: { id: existingRelation.id },
        data: {
          isActive: true,
          tag: dto.tag || existingRelation.tag || 'core',
        },
        include: { keyword: true },
      });
    }

    // 4. Executa a primeira busca na Play Store para aferir o ranking atual
    let currentRank: number | null = null;
    try {
      const searchResults = await this.scraper.search(cleanKeyword, {
        country: app.country,
        lang: app.lang,
        num: 100,
      });

      const foundIndex = searchResults.findIndex(
        (item) => item.appId.toLowerCase() === app.appId.toLowerCase(),
      );

      if (foundIndex >= 0) {
        currentRank = foundIndex + 1;
      }
    } catch (err: any) {
      this.logger.warn(
        `Não foi possível verificar o rank inicial da keyword "${cleanKeyword}": ${err.message}`,
      );
    }

    // 5. Cria o registro de rastreamento do app
    const appKeyword = await this.prisma.asoAppKeyword.create({
      data: {
        asoAppId: app.id,
        keywordId: keyword.id,
        currentRank,
        previousRank: null,
        bestRank: currentRank,
        tag: dto.tag || 'core',
        isActive: true,
        lastTrackedAt: new Date(),
      },
      include: { keyword: true },
    });

    // 6. Grava ponto inicial na série temporal de rankings
    if (currentRank !== null) {
      await this.prisma.asoKeywordRankingHistory.create({
        data: {
          appKeywordId: appKeyword.id,
          rank: currentRank,
          recordedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Palavra-chave "${cleanKeyword}" vinculada ao app ${app.appId} com Rank inicial: ${currentRank || 'Fora do top 100'}`,
    );

    return appKeyword;
  }

  /**
   * Lista todas as palavras-chave ativas vinculadas a um aplicativo monitorado.
   */
  async listTrackedKeywords(organizationId: string, asoAppId: string) {
    const app = await this.prisma.asoApp.findFirst({
      where: { id: asoAppId, organizationId },
    });

    if (!app) {
      throw new NotFoundException('Aplicativo monitorado não encontrado.');
    }

    return this.prisma.asoAppKeyword.findMany({
      where: {
        asoAppId,
        isActive: true,
      },
      include: {
        keyword: true,
      },
      orderBy: [
        { currentRank: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Força a rechecagem imediata do posicionamento de uma palavra-chave na Play Store.
   */
  async checkRank(
    organizationId: string,
    asoAppId: string,
    keywordId: string,
  ) {
    const app = await this.prisma.asoApp.findFirst({
      where: { id: asoAppId, organizationId },
    });

    if (!app) {
      throw new NotFoundException('Aplicativo monitorado não encontrado.');
    }

    const appKeyword = await this.prisma.asoAppKeyword.findFirst({
      where: {
        asoAppId,
        keywordId,
      },
      include: {
        keyword: true,
      },
    });

    if (!appKeyword) {
      throw new NotFoundException('Palavra-chave não vinculada a este aplicativo.');
    }

    // Executa busca na Play Store
    const searchResults = await this.scraper.search(appKeyword.keyword.keyword, {
      country: app.country,
      lang: app.lang,
      num: 100,
    });

    const foundIndex = searchResults.findIndex(
      (item) => item.appId.toLowerCase() === app.appId.toLowerCase(),
    );

    const newRank = foundIndex >= 0 ? foundIndex + 1 : null;
    let newBestRank = appKeyword.bestRank;

    if (newRank !== null) {
      newBestRank = appKeyword.bestRank
        ? Math.min(appKeyword.bestRank, newRank)
        : newRank;
    }

    // Atualiza o ranking
    const updated = await this.prisma.asoAppKeyword.update({
      where: { id: appKeyword.id },
      data: {
        previousRank: appKeyword.currentRank,
        currentRank: newRank,
        bestRank: newBestRank,
        lastTrackedAt: new Date(),
      },
      include: { keyword: true },
    });

    // Grava histórico
    if (newRank !== null) {
      await this.prisma.asoKeywordRankingHistory.create({
        data: {
          appKeywordId: appKeyword.id,
          rank: newRank,
          recordedAt: new Date(),
        },
      });
    }

    return updated;
  }

  /**
   * Obtém a série temporal de histórico de posições da palavra-chave.
   */
  async getKeywordHistory(
    organizationId: string,
    asoAppId: string,
    keywordId: string,
    days = 30,
  ) {
    const app = await this.prisma.asoApp.findFirst({
      where: { id: asoAppId, organizationId },
    });

    if (!app) {
      throw new NotFoundException('Aplicativo monitorado não encontrado.');
    }

    const appKeyword = await this.prisma.asoAppKeyword.findFirst({
      where: { asoAppId, keywordId },
    });

    if (!appKeyword) {
      throw new NotFoundException('Palavra-chave não vinculada a este aplicativo.');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const history = await this.prisma.asoKeywordRankingHistory.findMany({
      where: {
        appKeywordId: appKeyword.id,
        recordedAt: { gte: cutoffDate },
      },
      orderBy: { recordedAt: 'asc' },
    });

    return {
      keywordId,
      currentRank: appKeyword.currentRank,
      bestRank: appKeyword.bestRank,
      history,
    };
  }

  /**
   * Remove ou desativa o monitoramento de uma palavra-chave.
   */
  async untrackKeyword(
    organizationId: string,
    asoAppId: string,
    keywordId: string,
  ) {
    const app = await this.prisma.asoApp.findFirst({
      where: { id: asoAppId, organizationId },
    });

    if (!app) {
      throw new NotFoundException('Aplicativo monitorado não encontrado.');
    }

    const appKeyword = await this.prisma.asoAppKeyword.findFirst({
      where: { asoAppId, keywordId },
    });

    if (!appKeyword) {
      throw new NotFoundException('Palavra-chave não vinculada a este aplicativo.');
    }

    await this.prisma.asoAppKeyword.delete({
      where: { id: appKeyword.id },
    });

    return {
      success: true,
      message: 'Palavra-chave desvinculada do monitoramento com sucesso.',
    };
  }
}

