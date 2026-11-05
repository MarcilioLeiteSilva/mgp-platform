import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AsoAuditRecommendationItem } from '@mgp/contracts';

@Injectable()
export class AsoAuditService {
  private readonly logger = new Logger(AsoAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executa a auditoria heurística completa de um aplicativo monitorado
   * e persiste o relatório de pontuação no histórico.
   */
  async runAudit(organizationId: string, asoAppId: string) {
    const app = await this.prisma.asoApp.findFirst({
      where: {
        id: asoAppId,
        organizationId,
      },
    });

    if (!app) {
      throw new NotFoundException('Aplicativo monitorado não encontrado para auditoria.');
    }

    const metadata: any = app.metadata || {};
    const title = app.title || '';
    const summary = metadata.summary || '';
    const description = metadata.description || '';
    const screenshots: string[] = Array.isArray(metadata.screenshots)
      ? metadata.screenshots
      : [];
    const score = Number(app.score) || 0;
    const ratings = Number(app.ratings) || 0;

    const recommendations: AsoAuditRecommendationItem[] = [];

    // 1. Avaliação do Título (Peso: 25%) - Limite Google Play: 30 caracteres
    const titleLength = title.trim().length;
    let titleScore = 100;

    if (titleLength === 0) {
      titleScore = 0;
      recommendations.push({
        id: 'rec_title_empty',
        category: 'TITLE',
        severity: 'HIGH',
        message: 'O aplicativo não possui título cadastrado.',
        suggestedAction: 'Defina um título contendo a marca e a principal palavra-chave.',
      });
    } else if (titleLength < 15) {
      titleScore = 60;
      recommendations.push({
        id: 'rec_title_short',
        category: 'TITLE',
        severity: 'HIGH',
        message: `O título possui apenas ${titleLength} caracteres. O limite máximo da Google Play é de 30 caracteres.`,
        suggestedAction:
          'Aproveite os caracteres restantes para incluir sua palavra-chave mais relevante (ex: "Marca: Palavra-chave").',
      });
    } else if (titleLength >= 15 && titleLength < 22) {
      titleScore = 80;
      recommendations.push({
        id: 'rec_title_moderate',
        category: 'TITLE',
        severity: 'LOW',
        message: `O título possui ${titleLength} caracteres. Pode ser otimizado para se aproximar dos 30 caracteres recomendados.`,
        suggestedAction: 'Insira um subtítulo ou termo de pesquisa de alto volume.',
      });
    } else if (titleLength > 30) {
      titleScore = 70;
      recommendations.push({
        id: 'rec_title_excessive',
        category: 'TITLE',
        severity: 'HIGH',
        message: `O título possui ${titleLength} caracteres, excedendo o limite de 30 da Google Play Store.`,
        suggestedAction: 'Reduza o título para até 30 caracteres para evitar rejeição na loja.',
      });
    }

    // 2. Avaliação da Descrição Curta / Resumo (Peso: 15%) - Limite: 80 caracteres
    const summaryLength = summary.trim().length;
    let shortDescriptionScore = 100;

    if (summaryLength === 0) {
      shortDescriptionScore = 30;
      recommendations.push({
        id: 'rec_summary_empty',
        category: 'DESCRIPTION',
        severity: 'HIGH',
        message: 'A descrição curta (resumo) está ausente.',
        suggestedAction:
          'Escreva uma frase de impacto de até 80 caracteres com sua proposta de valor e palavras-chave.',
      });
    } else if (summaryLength < 45) {
      shortDescriptionScore = 70;
      recommendations.push({
        id: 'rec_summary_short',
        category: 'DESCRIPTION',
        severity: 'MEDIUM',
        message: `A descrição curta possui apenas ${summaryLength} caracteres (limite recomendado: 60-80).`,
        suggestedAction:
          'Amplie o resumo detalhando o benefício central com termos pesquisados pelos usuários.',
      });
    } else if (summaryLength > 80) {
      shortDescriptionScore = 70;
      recommendations.push({
        id: 'rec_summary_long',
        category: 'DESCRIPTION',
        severity: 'HIGH',
        message: 'A descrição curta excede 80 caracteres permitidos pela loja.',
        suggestedAction: 'Ajuste para menos de 80 caracteres.',
      });
    }

    // 3. Avaliação da Descrição Longa (Peso: 20%) - Limite: 4.000 caracteres
    const descLength = description.trim().length;
    let longDescriptionScore = 100;

    if (descLength < 500) {
      longDescriptionScore = 40;
      recommendations.push({
        id: 'rec_desc_very_short',
        category: 'DESCRIPTION',
        severity: 'HIGH',
        message: `A descrição completa possui apenas ${descLength} caracteres (recomendado: 2.000 a 3.500).`,
        suggestedAction:
          'Expanda a descrição detalhando funcionalidades, casos de uso, diferenciais e palavras-chave secundárias.',
      });
    } else if (descLength < 1500) {
      longDescriptionScore = 75;
      recommendations.push({
        id: 'rec_desc_moderate',
        category: 'DESCRIPTION',
        severity: 'MEDIUM',
        message: `A descrição possui ${descLength} caracteres. Descrições com mais de 2.000 caracteres têm melhor indexação orgânica.`,
        suggestedAction: 'Adicione seções explicativas, tópicos com bullet points e FAQ.',
      });
    } else if (descLength > 4000) {
      longDescriptionScore = 60;
      recommendations.push({
        id: 'rec_desc_exceeded',
        category: 'DESCRIPTION',
        severity: 'HIGH',
        message: 'A descrição ultrapassa o limite de 4.000 caracteres da loja.',
        suggestedAction: 'Enxugue o texto para caber no limite oficial.',
      });
    }

    // 4. Avaliação do Ícone (Peso: 10%)
    let iconScore = 100;
    if (!app.icon || app.icon.trim() === '') {
      iconScore = 0;
      recommendations.push({
        id: 'rec_icon_missing',
        category: 'GRAPHICS',
        severity: 'HIGH',
        message: 'Ícone do aplicativo não foi identificado.',
        suggestedAction: 'Cadastre um ícone de alta resolução com contraste destacado.',
      });
    }

    // 5. Avaliação de Screenshots (Peso: 15%)
    let screenshotsScore = 100;
    const screensCount = screenshots.length;

    if (screensCount === 0) {
      screenshotsScore = 0;
      recommendations.push({
        id: 'rec_screens_none',
        category: 'GRAPHICS',
        severity: 'HIGH',
        message: 'Nenhuma captura de tela (screenshot) foi encontrada.',
        suggestedAction: 'Adicione pelo menos 5 capturas de tela das principais funcionalidades.',
      });
    } else if (screensCount < 3) {
      screenshotsScore = 50;
      recommendations.push({
        id: 'rec_screens_few',
        category: 'GRAPHICS',
        severity: 'HIGH',
        message: `O aplicativo possui apenas ${screensCount} screenshots. A Google Play exige ao menos 4 para bom ranqueamento.`,
        suggestedAction: 'Suba mais capturas de tela com legendas e destaques visuais.',
      });
    } else if (screensCount < 6) {
      screenshotsScore = 80;
      recommendations.push({
        id: 'rec_screens_moderate',
        category: 'GRAPHICS',
        severity: 'LOW',
        message: `O app possui ${screensCount} screenshots. O número ideal para conversão é entre 6 e 8.`,
        suggestedAction: 'Complete a galeria mostrando fluxo de uso e depoimentos.',
      });
    }

    // 6. Avaliação de Notas e Reviews (Peso: 15%)
    let ratingsScore = 100;

    if (score >= 4.5) {
      ratingsScore = 100;
    } else if (score >= 4.2) {
      ratingsScore = 90;
    } else if (score >= 4.0) {
      ratingsScore = 80;
    } else if (score >= 3.5) {
      ratingsScore = 60;
      recommendations.push({
        id: 'rec_ratings_low',
        category: 'RATINGS',
        severity: 'HIGH',
        message: `Nota média de ${score.toFixed(1)} está abaixo do padrão de excelência (4.0+).`,
        suggestedAction:
          'Analise as queixas mais frequentes nos reviews negativos e lance correções de bugs.',
      });
    } else {
      ratingsScore = 40;
      recommendations.push({
        id: 'rec_ratings_critical',
        category: 'RATINGS',
        severity: 'HIGH',
        message: `Nota média crítica de ${score.toFixed(1)}. O algoritmo da Play Store desfavorece apps com nota inferior a 3.5.`,
        suggestedAction:
          'Implemente um prompt de avaliação in-app condicional apenas para usuários satisfeitos.',
      });
    }

    if (ratings < 100) {
      ratingsScore = Math.max(30, ratingsScore - 20);
      recommendations.push({
        id: 'rec_ratings_volume',
        category: 'RATINGS',
        severity: 'MEDIUM',
        message: `Volume de avaliações baixo (${ratings} avaliações).`,
        suggestedAction: 'Estimule a avaliação orgânica através do SDK in-app review.',
      });
    }

    // Cálculo consolidado da pontuação geral (Overall Score 0-100)
    const overallScore = Math.round(
      titleScore * 0.25 +
        shortDescriptionScore * 0.15 +
        longDescriptionScore * 0.2 +
        iconScore * 0.1 +
        screenshotsScore * 0.15 +
        ratingsScore * 0.15,
    );

    // Se nenhuma recomendação grave foi disparada, adiciona feedback positivo
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'rec_all_good',
        category: 'TITLE',
        severity: 'INFO',
        message: 'Excelente otimização! Todos os parâmetros essenciais de ASO estão em conformidade.',
        suggestedAction: 'Continue monitorando as posições das palavras-chave orgânicas.',
      });
    }

    // Grava no banco de dados relacional
    const auditRecord = await this.prisma.asoAuditScore.create({
      data: {
        asoAppId,
        overallScore,
        titleScore,
        shortDescriptionScore,
        longDescriptionScore,
        iconScore,
        screenshotsScore,
        ratingsScore,
        recommendations: recommendations as any,
        auditDate: new Date(),
      },
    });

    this.logger.log(
      `Auditoria concluída para o app ${app.appId} (${app.title}): Score Global ${overallScore}/100`,
    );

    return auditRecord;
  }

  /**
   * Obtém a auditoria mais recente de um aplicativo monitorado.
   */
  async getLatestAudit(organizationId: string, asoAppId: string) {
    const app = await this.prisma.asoApp.findFirst({
      where: { id: asoAppId, organizationId },
    });

    if (!app) {
      throw new NotFoundException('Aplicativo monitorado não encontrado.');
    }

    const latest = await this.prisma.asoAuditScore.findFirst({
      where: { asoAppId },
      orderBy: { auditDate: 'desc' },
    });

    if (!latest) {
      // Se ainda não houver auditoria gerada, executa a primeira automaticamente
      return this.runAudit(organizationId, asoAppId);
    }

    return latest;
  }

  /**
   * Obtém o histórico temporal de auditorias para análise evolutiva.
   */
  async getAuditHistory(organizationId: string, asoAppId: string) {
    const app = await this.prisma.asoApp.findFirst({
      where: { id: asoAppId, organizationId },
    });

    if (!app) {
      throw new NotFoundException('Aplicativo monitorado não encontrado.');
    }

    return this.prisma.asoAuditScore.findMany({
      where: { asoAppId },
      orderBy: { auditDate: 'desc' },
      take: 20,
    });
  }
}

