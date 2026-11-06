import { AdEventsProcessor } from './ad-events.processor';
import {
  AdClickJobPayload,
  AdImpressionJobPayload,
  AdRewardJobPayload,
  AdTrackingTokenPayload,
} from '@mgp/contracts';

describe('AdEventsProcessor', () => {
  let processor: AdEventsProcessor;
  let mockPrisma: any;

  const sampleTokenPayload: AdTrackingTokenPayload = {
    requestId: 'req-test-123',
    adUnitId: 'placement-test',
    campaignId: 'camp-test-456',
    creativeId: 'creat-test-789',
    publisherAppId: 'app-pub-001',
    publisherOrgId: 'org-pub-001',
    advertiserOrgId: 'org-adv-001',
    bidAmount: 5.50,
    clearingPrice: 4.25,
    billingModel: 'CPM',
    format: 'BANNER',
    actionUrl: 'https://example.com/download',
    issuedAt: Math.floor(Date.now() / 1000),
    expiresAt: Math.floor(Date.now() / 1000) + 900,
  };

  beforeEach(() => {
    mockPrisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-123' }),
      },
    };
    processor = new AdEventsProcessor(mockPrisma);
  });

  describe('processImpression', () => {
    it('deve processar impressão em modelo CPM calculando custo proporcional ao clearingPrice', async () => {
      const payload: AdImpressionJobPayload = {
        tokenPayload: sampleTokenPayload,
        nonce: 'nonce-imp-1',
        renderedAt: new Date().toISOString(),
        visibilityMetrics: { viewablePercentage: 100, durationMs: 1200 },
        clientIp: '127.0.0.1',
        receivedAt: new Date().toISOString(),
      };

      const result = await processor.processImpression({ data: payload });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('IMPRESSION');
      expect(result.costApplied).toBeCloseTo(4.25 / 1000, 6);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AD_IMPRESSION_BILLED',
            entityId: 'camp-test-456',
          }),
        }),
      );
    });

    it('não deve cobrar custo em impressão de campanha com modelo CPC', async () => {
      const payload: AdImpressionJobPayload = {
        tokenPayload: { ...sampleTokenPayload, billingModel: 'CPC' },
        nonce: 'nonce-imp-2',
        renderedAt: new Date().toISOString(),
        visibilityMetrics: { viewablePercentage: 100, durationMs: 1500 },
        clientIp: '127.0.0.1',
        receivedAt: new Date().toISOString(),
      };

      const result = await processor.processImpression({ data: payload });

      expect(result.success).toBe(true);
      expect(result.costApplied).toBe(0);
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('deve retornar success=true mesmo com aviso em caso de falha silenciosa na auditoria', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB Timeout'));

      const payload: AdImpressionJobPayload = {
        tokenPayload: sampleTokenPayload,
        nonce: 'nonce-imp-3',
        renderedAt: new Date().toISOString(),
        visibilityMetrics: { viewablePercentage: 100, durationMs: 1000 },
        clientIp: '127.0.0.1',
        receivedAt: new Date().toISOString(),
      };

      const result = await processor.processImpression({ data: payload });
      expect(result.success).toBe(true);
    });
  });

  describe('processClick', () => {
    it('deve processar clique em modelo CPC debitando o bidAmount integral', async () => {
      const payload: AdClickJobPayload = {
        tokenPayload: { ...sampleTokenPayload, billingModel: 'CPC', bidAmount: 1.85 },
        nonce: 'nonce-click-1',
        clickedAt: new Date().toISOString(),
        clientIp: '127.0.0.1',
        receivedAt: new Date().toISOString(),
      };

      const result = await processor.processClick({ data: payload });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('CLICK');
      expect(result.costApplied).toBe(1.85);
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AD_CLICK_BILLED',
            entityId: 'camp-test-456',
          }),
        }),
      );
    });

    it('não deve cobrar no clique se a campanha tiver modelo CPM (já cobrado na impressão)', async () => {
      const payload: AdClickJobPayload = {
        tokenPayload: { ...sampleTokenPayload, billingModel: 'CPM' },
        nonce: 'nonce-click-2',
        clickedAt: new Date().toISOString(),
        clientIp: '127.0.0.1',
        receivedAt: new Date().toISOString(),
      };

      const result = await processor.processClick({ data: payload });

      expect(result.success).toBe(true);
      expect(result.costApplied).toBe(0);
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('processReward', () => {
    it('deve registrar auditoria oficial da recompensa concedida com sucesso', async () => {
      const payload: AdRewardJobPayload = {
        tokenPayload: {
          ...sampleTokenPayload,
          format: 'REWARDED',
          rewardType: 'GEMS',
          rewardAmount: 50,
        },
        nonce: 'nonce-reward-1',
        completedAt: new Date().toISOString(),
        watchDurationSeconds: 15,
        clientIp: '127.0.0.1',
        receivedAt: new Date().toISOString(),
      };

      const result = await processor.processReward({ data: payload });

      expect(result.success).toBe(true);
      expect(result.eventType).toBe('REWARD');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AD_REWARD_GRANTED',
            entityId: 'app-pub-001',
          }),
        }),
      );
    });
  });
});

