import { Test, TestingModule } from '@nestjs/testing';
import { SmartBiddingService } from './smart-bidding.service';
import { PacingMode } from '@mgp/shared';

describe('SmartBiddingService', () => {
  let service: SmartBiddingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SmartBiddingService],
    }).compile();

    service = module.get<SmartBiddingService>(SmartBiddingService);
  });

  describe('evaluatePacing', () => {
    it('deve retornar ON_TRACK quando o gasto estiver alinhado com a fração horária', () => {
      // 12:00 (hora 12). Fração = 13/24 (~0.5417). Budget 100 -> Expected ~54.17
      const res = service.evaluatePacing(100, 54.17, PacingMode.EVEN, 12);

      expect(res.pacingStatus).toBe('ON_TRACK');
      expect(res.pacingMultiplier).toBe(1.0);
      expect(res.currentHour).toBe(12);
    });

    it('deve retornar AHEAD e reduzir multiplicador de lance quando o gasto estiver adiantado', () => {
      // Hora 6 (manhã). Expected = 7/24 * 100 = 29.17. Actual = 80 (gastou muito rápido)
      const res = service.evaluatePacing(100, 80, PacingMode.EVEN, 6);

      expect(res.pacingStatus).toBe('AHEAD');
      expect(res.pacingMultiplier).toBeLessThan(1.0);
      expect(res.pacingMultiplier).toBeGreaterThanOrEqual(0.75);
    });

    it('deve retornar BEHIND e elevar multiplicador quando o gasto estiver atrasado', () => {
      // Hora 18 (fim de tarde). Expected = 19/24 * 100 = 79.17. Actual = 20 (gastou pouco)
      const res = service.evaluatePacing(100, 20, PacingMode.EVEN, 18);

      expect(res.pacingStatus).toBe('BEHIND');
      expect(res.pacingMultiplier).toBeGreaterThan(1.0);
      expect(res.pacingMultiplier).toBeLessThanOrEqual(1.25);
    });

    it('deve manter multiplicador 1.0 em modo ACCELERATED', () => {
      const res = service.evaluatePacing(100, 50, PacingMode.ACCELERATED, 10);

      expect(res.pacingMode).toBe(PacingMode.ACCELERATED);
      expect(res.pacingMultiplier).toBe(1.0);
    });
  });

  describe('simulateBid', () => {
    it('deve calcular variações de lance e estimar pontos de entrega para modelo CPM', () => {
      const res = service.simulateBid(2.0, 'CPM', 100, 'IMPRESSIONS');

      expect(res.currentBid).toBe(2.0);
      expect(res.billingModel).toBe('CPM');
      expect(res.points).toHaveLength(6);
      expect(res.suggestedOptimalBid).toBeGreaterThan(2.0);
      expect(res.optimalMultiplier).toBeGreaterThanOrEqual(1.0);

      const basePoint = res.points.find((p) => p.bidVariationPct === 0);
      expect(basePoint).toBeDefined();
      expect(basePoint?.simulatedBid).toBe(2.0);
      expect(basePoint?.estimatedWinRate).toBeGreaterThan(0);
    });

    it('deve calcular eCPM efetivo para modelo CPC', () => {
      const res = service.simulateBid(1.5, 'CPC', 150, 'CLICKS');

      expect(res.billingModel).toBe('CPC');
      const point0 = res.points.find((p) => p.bidVariationPct === 0);
      expect(point0?.projectedEcpm).toBeGreaterThan(0);
    });
  });
});

