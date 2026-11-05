import { AsoAuditRecommendationItem } from '@mgp/contracts';

export interface AuditInputData {
  title?: string | null;
  summary?: string | null;
  description?: string | null;
  icon?: string | null;
  screenshots?: string[] | null;
  score?: number | null;
  ratings?: number | null;
}

export interface CalculatedAuditResult {
  overallScore: number;
  titleScore: number;
  shortDescriptionScore: number;
  longDescriptionScore: number;
  iconScore: number;
  screenshotsScore: number;
  ratingsScore: number;
  recommendations: AsoAuditRecommendationItem[];
}

export class WorkerAuditService {
  /**
   * Calcula as notas e recomendações heurísticas de ASO para os metadados do app.
   */
  calculateAudit(data: AuditInputData): CalculatedAuditResult {
    const title = (data.title || '').trim();
    const summary = (data.summary || '').trim();
    const description = (data.description || '').trim();
    const icon = (data.icon || '').trim();
    const screenshots = Array.isArray(data.screenshots) ? data.screenshots : [];
    const score = Number(data.score) || 0;
    const ratings = Number(data.ratings) || 0;

    const recommendations: AsoAuditRecommendationItem[] = [];

    // 1. Título (Peso: 25%) - Ideal: 20-30 caracteres
    const titleLength = title.length;
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

    // 2. Descrição Curta / Resumo (Peso: 15%) - Ideal: 50-80 caracteres
    const summaryLength = summary.length;
    let shortDescriptionScore = 100;

    if (summaryLength === 0) {
      shortDescriptionScore = 30;
      recommendations.push({
        id: 'rec_summary_empty',
        category: 'DESCRIPTION',
        severity: 'HIGH',
        message: 'A descrição curta (resumo) não está preenchida.',
        suggestedAction:
          'Adicione uma descrição curta de até 80 caracteres com a principal proposta de valor e palavras-chave secundárias.',
      });
    } else if (summaryLength < 35) {
      shortDescriptionScore = 65;
      recommendations.push({
        id: 'rec_summary_short',
        category: 'DESCRIPTION',
        severity: 'MEDIUM',
        message: `A descrição curta possui apenas ${summaryLength} caracteres (limite: 80).`,
        suggestedAction: 'Expanda o resumo destacando os benefícios mais atraentes para aumentar o CTR.',
      });
    } else if (summaryLength > 80) {
      shortDescriptionScore = 75;
      recommendations.push({
        id: 'rec_summary_excessive',
        category: 'DESCRIPTION',
        severity: 'HIGH',
        message: `A descrição curta possui ${summaryLength} caracteres, ultrapassando o teto de 80 caracteres da Play Store.`,
        suggestedAction: 'Ajuste para menos de 80 caracteres.',
      });
    }

    // 3. Descrição Completa (Peso: 20%) - Ideal: 2000-3500 caracteres
    const descLength = description.length;
    let longDescriptionScore = 100;

    if (descLength === 0) {
      longDescriptionScore = 20;
      recommendations.push({
        id: 'rec_desc_empty',
        category: 'DESCRIPTION',
        severity: 'HIGH',
        message: 'A descrição completa do app está vazia.',
        suggestedAction:
          'Elabore uma descrição estruturada de 2.000 a 3.500 caracteres detalhando funcionalidades e benefícios.',
      });
    } else if (descLength < 1000) {
      longDescriptionScore = 55;
      recommendations.push({
        id: 'rec_desc_very_short',
        category: 'DESCRIPTION',
        severity: 'HIGH',
        message: `A descrição longa possui apenas ${descLength} caracteres. O algoritmo do Google Play indexa palavras-chave com base na frequência e relevância contextual.`,
        suggestedAction:
          'Aumente o texto para pelo menos 2.000 caracteres, distribuindo palavras-chave naturalmente com densidade entre 2% e 3%.',
      });
    } else if (descLength < 2000) {
      longDescriptionScore = 80;
      recommendations.push({
        id: 'rec_desc_moderate',
        category: 'DESCRIPTION',
        severity: 'LOW',
        message: `A descrição longa possui ${descLength} caracteres. Há oportunidade para expandir seções e bullet points.`,
        suggestedAction: 'Adicione seções de perguntas frequentes ou lista detalhada de recursos.',
      });
    } else if (descLength > 4000) {
      longDescriptionScore = 70;
      recommendations.push({
        id: 'rec_desc_exceeded',
        category: 'DESCRIPTION',
        severity: 'HIGH',
        message: `A descrição excede o limite máximo permitido pela Google Play (4.000 caracteres).`,
        suggestedAction: 'Reduza a descrição para até 4.000 caracteres.',
      });
    }

    // 4. Ícone do Aplicativo (Peso: 10%)
    let iconScore = 100;
    if (!icon || icon.length === 0) {
      iconScore = 20;
      recommendations.push({
        id: 'rec_icon_missing',
        category: 'GRAPHICS',
        severity: 'HIGH',
        message: 'Ícone não detectado na listagem da loja.',
        suggestedAction: 'Envie um ícone em alta resolução (512x512 PNG 32-bit).',
      });
    }

    // 5. Screenshots / Galeria Visual (Peso: 15%) - Mínimo: 3, Ideal: 5-8
    const screenshotCount = screenshots.length;
    let screenshotsScore = 100;

    if (screenshotCount === 0) {
      screenshotsScore = 0;
      recommendations.push({
        id: 'rec_screenshots_none',
        category: 'GRAPHICS',
        severity: 'HIGH',
        message: 'Nenhum screenshot encontrado na página do app.',
        suggestedAction:
          'Envie pelo menos 5 screenshots profissionais com legendas explicativas (callouts).',
      });
    } else if (screenshotCount < 3) {
      screenshotsScore = 50;
      recommendations.push({
        id: 'rec_screenshots_few',
        category: 'GRAPHICS',
        severity: 'HIGH',
        message: `Apenas ${screenshotCount} screenshot(s) cadastrado(s). A loja exige ao menos 2 e recomenda ao menos 5.`,
        suggestedAction: 'Adicione mais capturas de tela demonstrando a jornada principal do usuário.',
      });
    } else if (screenshotCount < 5) {
      screenshotsScore = 80;
      recommendations.push({
        id: 'rec_screenshots_moderate',
        category: 'GRAPHICS',
        severity: 'MEDIUM',
        message: `O app possui ${screenshotCount} screenshots. Apps no topo da categoria costumam utilizar de 6 a 8 imagens.`,
        suggestedAction: 'Adicione mais 2 ou 3 screenshots focados em provas sociais e benefícios.',
      });
    }

    // 6. Avaliações e Prova Social (Peso: 15%) - Nota ideal: >= 4.0
    let ratingsScore = 100;

    if (ratings === 0 && score === 0) {
      ratingsScore = 50;
      recommendations.push({
        id: 'rec_ratings_none',
        category: 'RATINGS',
        severity: 'MEDIUM',
        message: 'O app ainda não possui volume mensurável de avaliações públicas.',
        suggestedAction:
          'Ative campanhas in-app com o In-App Review API para incentivar usuários engajados a avaliar.',
      });
    } else if (score < 3.5) {
      ratingsScore = 40;
      recommendations.push({
        id: 'rec_ratings_critical',
        category: 'RATINGS',
        severity: 'HIGH',
        message: `Nota média de ${score.toFixed(1)} é crítica e penaliza severamente o rank de busca e taxa de conversão.`,
        suggestedAction:
          'Priorize correções de bugs relatados nas reviews e responda aos comentários negativos rapidamente.',
      });
    } else if (score < 4.0) {
      ratingsScore = 70;
      recommendations.push({
        id: 'rec_ratings_below_average',
        category: 'RATINGS',
        severity: 'MEDIUM',
        message: `Nota média de ${score.toFixed(1)}. O padrão competitivo dos líderes de mercado é nota superior a 4.2.`,
        suggestedAction: 'Otimize a satisfação do usuário e resolva pontos de atrito recentes.',
      });
    } else if (score >= 4.5) {
      ratingsScore = 100;
    } else {
      ratingsScore = 90;
    }

    // Cálculo da Pontuação Ponderada Final (0 a 100)
    const weightedScore =
      titleScore * 0.25 +
      shortDescriptionScore * 0.15 +
      longDescriptionScore * 0.2 +
      iconScore * 0.1 +
      screenshotsScore * 0.15 +
      ratingsScore * 0.15;

    const overallScore = Math.round(Math.min(Math.max(weightedScore, 0), 100));

    return {
      overallScore,
      titleScore: Math.round(titleScore),
      shortDescriptionScore: Math.round(shortDescriptionScore),
      longDescriptionScore: Math.round(longDescriptionScore),
      iconScore: Math.round(iconScore),
      screenshotsScore: Math.round(screenshotsScore),
      ratingsScore: Math.round(ratingsScore),
      recommendations,
    };
  }
}

