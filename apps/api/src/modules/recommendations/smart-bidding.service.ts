import { Injectable } from '@nestjs/common';
import { PacingMode } from '@mgp/shared';

export interface PacingEvaluation {
  pacingMode: PacingMode;
  currentHour: number;
  expectedSpendFraction: number;
  expectedSpend: number;
  actualSpend: number;
  pacingStatus: 'BEHIND' | 'ON_TRACK' | 'AHEAD';
  pacingMultiplier: number;
  recommendedAction?: string;
}

export interface BidSimulationPoint {
  bidVariationPct: number;
  simulatedBid: number;
  estimatedWinRate: number;
  projectedImpressions: number;
  projectedClicks: number;
  projectedSpend: number;
  projectedEcpm: number;
}

export interface BidSimulationResult {
  currentBid: number;
  billingModel: string;
  dailyBudget: number;
  targetMetric: string;
  suggestedOptimalBid: number;
  optimalMultiplier: number;
  points: BidSimulationPoint[];
}

@Injectable()
export class SmartBiddingService {
  /**
   * Avalia o ritmo de consumo do orçamento (Pacing) ao longo das 24h
   */
  evaluatePacing(
    dailyBudget: number,
    spentToday: number,
    pacingMode: PacingMode = PacingMode.EVEN,
    currentHour?: number,
  ): PacingEvaluation {
    const hour = currentHour !== undefined ? currentHour : new Date().getHours();
    const clampedHour = Math.max(0, Math.min(23, hour));

    // Fração esperada do dia: (hora + 1) / 24
    const expectedSpendFraction = Number(((clampedHour + 1) / 24).toFixed(4));
    const expectedSpend = Number((dailyBudget * expectedSpendFraction).toFixed(2));
    const actualSpend = Number(spentToday.toFixed(2));

    if (pacingMode === PacingMode.ACCELERATED) {
      return {
        pacingMode,
        currentHour: clampedHour,
        expectedSpendFraction,
        expectedSpend,
        actualSpend,
        pacingStatus: actualSpend >= dailyBudget ? 'AHEAD' : 'ON_TRACK',
        pacingMultiplier: 1.0,
        recommendedAction: 'Modo acelerado: lances máximos até exaustão do orçamento diário.',
      };
    }

    let pacingStatus: 'BEHIND' | 'ON_TRACK' | 'AHEAD' = 'ON_TRACK';
    let pacingMultiplier = 1.0;
    let recommendedAction = 'Consumo no ritmo previsto para o dia.';

    // Se gastou > 20% a mais do esperado para o horário -> Pacing adiantado
    if (actualSpend > expectedSpend * 1.2 && expectedSpend > 0) {
      pacingStatus = 'AHEAD';
      // Reduz o lance levemente (fator entre 0.75 e 0.90) para amortecer entrega até a noite
      const ratio = expectedSpend / (actualSpend || 1);
      pacingMultiplier = Number(Math.max(0.75, Math.min(0.9, ratio)).toFixed(2));
      recommendedAction = 'Gasto adiantado: amortecendo lance efetivo para preservar orçamento para o pico noturno.';
    } else if (actualSpend < expectedSpend * 0.75) {
      pacingStatus = 'BEHIND';
      // Aumenta o lance de forma controlada (fator entre 1.10 e 1.25) para recuperar volume
      pacingMultiplier = Number(Math.min(1.25, 1 + (expectedSpend - actualSpend) / (dailyBudget || 1)).toFixed(2));
      recommendedAction = 'Gasto aquém do planejado: impulsionando lances para garantir preenchimento da meta diária.';
    }

    return {
      pacingMode,
      currentHour: clampedHour,
      expectedSpendFraction,
      expectedSpend,
      actualSpend,
      pacingStatus,
      pacingMultiplier,
      recommendedAction,
    };
  }

  /**
   * Simula curvas de lances com base em elasticidade e modelos preditivos
   */
  simulateBid(
    currentBid: number,
    billingModel: string = 'CPM',
    dailyBudget: number = 100,
    targetMetric: 'IMPRESSIONS' | 'CLICKS' | 'CONVERSIONS' = 'IMPRESSIONS',
  ): BidSimulationResult {
    const variations = [-20, -10, 0, 10, 20, 30];
    const points: BidSimulationPoint[] = [];

    // Base de CTR padrão de mercado de 1.8%
    const baseCtr = 0.018;
    const baseCvr = 0.08;

    for (const v of variations) {
      const simBid = Number((currentBid * (1 + v / 100)).toFixed(2));
      // Modelo logístico simplificado para estimativa de Win Rate (30% base com elasticidade)
      const estimatedWinRate = Number(
        Math.min(0.95, Math.max(0.1, 0.35 + (v / 100) * 0.3)).toFixed(3),
      );

      // Impressões estimadas proporcionais ao win rate e limitadas pelo orçamento
      const effectiveCpm =
        billingModel === 'CPM'
          ? simBid
          : billingModel === 'CPC'
          ? simBid * baseCtr * 1000
          : simBid * baseCtr * baseCvr * 1000;

      const safeCpm = Math.max(0.5, effectiveCpm);
      const maxPossibleImpressions = Math.floor((dailyBudget / safeCpm) * 1000);
      const projectedImpressions = Math.floor(maxPossibleImpressions * estimatedWinRate);
      const projectedClicks = Math.floor(projectedImpressions * baseCtr);
      const projectedSpend = Number(
        Math.min(dailyBudget, (projectedImpressions / 1000) * safeCpm).toFixed(2),
      );

      points.push({
        bidVariationPct: v,
        simulatedBid: simBid,
        estimatedWinRate,
        projectedImpressions,
        projectedClicks,
        projectedSpend,
        projectedEcpm: Number(safeCpm.toFixed(2)),
      });
    }

    // Ponto ótimo sugerido: geralmente +15% a +20% quando busca impressões
    const optimalPoint =
      targetMetric === 'CLICKS'
        ? points.find((p) => p.bidVariationPct === 10) || points[2]
        : points.find((p) => p.bidVariationPct === 20) || points[3];

    return {
      currentBid,
      billingModel,
      dailyBudget,
      targetMetric,
      suggestedOptimalBid: optimalPoint.simulatedBid,
      optimalMultiplier: Number((optimalPoint.simulatedBid / (currentBid || 1)).toFixed(2)),
      points,
    };
  }
}
