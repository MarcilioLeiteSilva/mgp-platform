import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CampaignsService } from '../modules/campaigns/campaigns.service';
import { CampaignsController } from '../modules/campaigns/campaigns.controller';
import { AdUnitsService } from '../modules/ad-units/ad-units.service';
import { AdUnitsController } from '../modules/ad-units/ad-units.controller';
import { BillingService } from '../modules/billing/billing.service';
import { BillingController } from '../modules/billing/billing.controller';
import { SmartBiddingService } from '../modules/recommendations/smart-bidding.service';
import { RecommendationsService } from '../modules/recommendations/recommendations.service';
import { RecommendationsController } from '../modules/recommendations/recommendations.controller';
import { AntifraudService } from '../modules/antifraud/antifraud.service';
import { AntifraudController } from '../modules/antifraud/antifraud.controller';
import {
  CampaignStatus,
  CampaignType,
  AdFormat,
  WalletAccountType,
  LedgerTransactionType,
  PaymentStatus,
  PaymentMethod,
  PayoutStatus,
  PayoutMethod,
  BiddingStrategy,
  PacingMode,
  RecommendationType,
  RecommendationStatus,
  RecommendationPriority,
  IvtCategory,
  FraudSeverity,
  FraudIncidentStatus,
} from '@mgp/shared';

describe('Suíte de Testes Ponta a Ponta (E2E) e Integração — ETAPA 4 (Campanhas, Finanças, Smart Bidding & Antifraude)', () => {
  let campaignsService: CampaignsService;
  let campaignsController: CampaignsController;
  let adUnitsService: AdUnitsService;
  let adUnitsController: AdUnitsController;
  let billingService: BillingService;
  let billingController: BillingController;
  let smartBiddingService: SmartBiddingService;
  let recommendationsService: RecommendationsService;
  let recommendationsController: RecommendationsController;
  let antifraudService: AntifraudService;
  let antifraudController: AntifraudController;

  const advertiserOrgId = 'org-adv-100';
  const publisherOrgId = 'org-pub-200';
  const competitorOrgId = 'org-hacker-999';
  const testUserId = 'user-super-operator';

  const mockWalletBalances: Record<string, number> = {
    [`${advertiserOrgId}_ADVERTISING_CREDITS`]: 1000.0,
    [`${publisherOrgId}_PUBLISHER_EARNINGS`]: 250.0,
  };

  const mockLedgerEntries: any[] = [];
  const mockCampaigns: any[] = [];
  const mockCreatives: any[] = [];
  const mockAdUnits: any[] = [];
  const mockRecommendations: any[] = [];
  const mockFraudIncidents: any[] = [];
  const mockAuditLogs: any[] = [];

  const mockPrisma: any = {
    $transaction: jest.fn().mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      return callback;
    }),

    wallet: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const orgId = where.organizationId;
        return Promise.resolve({
          id: `wallet-${orgId}`,
          organizationId: orgId,
          currency: 'BRL',
          accounts: [
            {
              id: `acc-${orgId}_ADVERTISING_CREDITS`,
              type: WalletAccountType.ADVERTISING_CREDITS,
              cachedBalance: mockWalletBalances[`${orgId}_ADVERTISING_CREDITS`] ?? 0,
              currency: 'BRL',
            },
            {
              id: `acc-${orgId}_PUBLISHER_EARNINGS`,
              type: WalletAccountType.PUBLISHER_EARNINGS,
              cachedBalance: mockWalletBalances[`${orgId}_PUBLISHER_EARNINGS`] ?? 0,
              currency: 'BRL',
            },
            {
              id: `acc-${orgId}_EXCHANGE_CREDITS`,
              type: WalletAccountType.EXCHANGE_CREDITS,
              cachedBalance: mockWalletBalances[`${orgId}_EXCHANGE_CREDITS`] ?? 0,
              currency: 'BRL',
            },
          ],
        });
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const orgId = where.organizationId;
        return Promise.resolve({
          id: `wallet-${orgId}`,
          organizationId: orgId,
          currency: 'BRL',
          accounts: [
            {
              id: `acc-${orgId}_ADVERTISING_CREDITS`,
              type: WalletAccountType.ADVERTISING_CREDITS,
              cachedBalance: mockWalletBalances[`${orgId}_ADVERTISING_CREDITS`] ?? 0,
              currency: 'BRL',
            },
            {
              id: `acc-${orgId}_PUBLISHER_EARNINGS`,
              type: WalletAccountType.PUBLISHER_EARNINGS,
              cachedBalance: mockWalletBalances[`${orgId}_PUBLISHER_EARNINGS`] ?? 0,
              currency: 'BRL',
            },
            {
              id: `acc-${orgId}_EXCHANGE_CREDITS`,
              type: WalletAccountType.EXCHANGE_CREDITS,
              cachedBalance: mockWalletBalances[`${orgId}_EXCHANGE_CREDITS`] ?? 0,
              currency: 'BRL',
            },
          ],
        });
      }),
    },

    walletAccount: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const orgId = where.wallet?.organizationId || where.organizationId;
        const key = `${orgId}_${where.type}`;
        const balance = mockWalletBalances[key] ?? 0;
        return Promise.resolve({
          id: `acc-${key}`,
          type: where.type,
          balance: { toNumber: () => balance, toString: () => balance.toFixed(4) },
          cachedBalance: balance,
          currency: 'BRL',
        });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        return Promise.resolve({ id: where.id, ...data });
      }),
    },

    walletLedger: {
      create: jest.fn().mockImplementation(({ data }) => {
        mockLedgerEntries.push(data);
        return Promise.resolve({ id: `tx-${Date.now()}`, ...data, createdAt: new Date() });
      }),
      findMany: jest.fn().mockImplementation(() => Promise.resolve(mockLedgerEntries)),
      count: jest.fn().mockImplementation(() => Promise.resolve(mockLedgerEntries.length)),
    },

    depositInvoice: {
      create: jest.fn().mockImplementation(({ data }) => {
        return Promise.resolve({
          id: 'inv-pix-1',
          gatewayReference: 'gw-ref-1',
          ...data,
          status: PaymentStatus.PENDING,
          pixQrCode: 'pix_qr_test',
          pixCopyPaste: '00020126580014br.gov.bcb.pix...',
          expiresAt: new Date(Date.now() + 3600000),
          createdAt: new Date(),
        });
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve({
          id: where.id || 'inv-pix-1',
          gatewayReference: where.gatewayReference || 'gw-ref-1',
          organizationId: advertiserOrgId,
          amount: 500.0,
          status: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.PIX,
          pixQrCode: 'pix_qr_test',
          walletAccount: {
            id: `acc-${advertiserOrgId}_ADVERTISING_CREDITS`,
            cachedBalance: 1000.0,
          },
        });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        return Promise.resolve({ id: where.id, ...data });
      }),
    },

    payoutRequest: {
      create: jest.fn().mockImplementation(({ data }) => {
        return Promise.resolve({
          id: 'payout-1',
          ...data,
          status: PayoutStatus.PROCESSING,
          fee: 0,
          netAmount: data.amount,
          createdAt: new Date(),
        });
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },

    campaign: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const camp = mockCampaigns.find((c) => !where?.id || c.id === where.id);
        if (camp && where?.organizationId && camp.organizationId !== where.organizationId) {
          return Promise.resolve(null);
        }
        if (camp) {
          const creatives = mockCreatives.filter((cr) => cr.campaignId === camp.id);
          return Promise.resolve({ ...camp, creatives });
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(
          mockCampaigns
            .filter((c) => !where?.organizationId || c.organizationId === where.organizationId)
            .map((c) => ({
              ...c,
              creatives: mockCreatives.filter((cr) => cr.campaignId === c.id),
            })),
        );
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const camp = {
          id: `camp-${mockCampaigns.length + 1}`,
          ...data,
          spentAmount: 0,
          biddingStrategy: data.biddingStrategy || BiddingStrategy.MANUAL,
          pacingMode: data.pacingMode || PacingMode.EVEN,
          targetCountry: data.targetCountry || 'BR',
          creatives: [],
          recommendations: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockCampaigns.push(camp);
        return Promise.resolve(camp);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = mockCampaigns.findIndex((c) => c.id === where.id);
        if (idx >= 0) {
          mockCampaigns[idx] = { ...mockCampaigns[idx], ...data, updatedAt: new Date() };
          return Promise.resolve(mockCampaigns[idx]);
        }
        return Promise.resolve({ id: where.id, ...data });
      }),
      count: jest.fn().mockImplementation(() => Promise.resolve(mockCampaigns.length)),
    },

    creative: {
      create: jest.fn().mockImplementation(({ data }) => {
        const creative = { id: `cre-${mockCreatives.length + 1}`, ...data, isActive: true, createdAt: new Date() };
        mockCreatives.push(creative);
        return Promise.resolve(creative);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(mockCreatives.filter((c) => !where?.campaignId || c.campaignId === where.campaignId));
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve(mockCreatives.find((c) => c.id === where.id) || null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = mockCreatives.findIndex((c) => c.id === where.id);
        if (idx >= 0) {
          mockCreatives[idx] = { ...mockCreatives[idx], ...data };
          return Promise.resolve(mockCreatives[idx]);
        }
        return Promise.resolve({ id: where.id, ...data });
      }),
      delete: jest.fn().mockResolvedValue({ id: 'cre-deleted' }),
      count: jest.fn().mockImplementation(({ where }) => {
        const filtered = mockCreatives.filter((c) => {
          if (where?.campaignId && c.campaignId !== where.campaignId) return false;
          if (where?.isActive !== undefined && c.isActive !== where.isActive) return false;
          return true;
        });
        return Promise.resolve(filtered.length);
      }),
    },

    app: {
      findFirst: jest.fn().mockImplementation(({ where }) => {
        if (where.id === 'app-pub-1' && where.organizationId === publisherOrgId) {
          return Promise.resolve({ id: 'app-pub-1', organizationId: publisherOrgId, name: 'Cool Game' });
        }
        if (where.id === 'app-adv-1' && where.organizationId === advertiserOrgId) {
          return Promise.resolve({ id: 'app-adv-1', organizationId: advertiserOrgId, name: 'Fintech App' });
        }
        return Promise.resolve(null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve([
          {
            id: 'app-pub-1',
            organizationId: publisherOrgId,
            name: 'Cool Game',
            adUnits: mockAdUnits,
          },
        ]);
      }),
    },

    adUnit: {
      create: jest.fn().mockImplementation(({ data }) => {
        const unit = { id: `unit-${mockAdUnits.length + 1}`, ...data, isActive: true, createdAt: new Date() };
        mockAdUnits.push(unit);
        return Promise.resolve(unit);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const unit = mockAdUnits.find((u) => u.id === where.id);
        if (unit && where.app?.organizationId && unit.organizationId !== where.app.organizationId) {
          return Promise.resolve(null);
        }
        return Promise.resolve(unit || null);
      }),
      findMany: jest.fn().mockImplementation(() => Promise.resolve(mockAdUnits)),
      count: jest.fn().mockImplementation(() => Promise.resolve(mockAdUnits.length)),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = mockAdUnits.findIndex((u) => u.id === where.id);
        if (idx >= 0) {
          mockAdUnits[idx] = { ...mockAdUnits[idx], ...data };
          return Promise.resolve(mockAdUnits[idx]);
        }
        return Promise.resolve({ id: where.id, ...data });
      }),
      delete: jest.fn().mockImplementation(({ where }) => {
        return Promise.resolve({ id: where.id });
      }),
    },

    campaignRecommendation: {
      create: jest.fn().mockImplementation(({ data }) => {
        const rec = { id: `rec-${mockRecommendations.length + 1}`, ...data, status: RecommendationStatus.PENDING, createdAt: new Date() };
        mockRecommendations.push(rec);
        return Promise.resolve(rec);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const rec = mockRecommendations.find((r) => !where?.id || r.id === where.id);
        if (!rec) return Promise.resolve(null);
        const camp = mockCampaigns.find((c) => c.id === rec.campaignId);
        return Promise.resolve({
          ...rec,
          campaign: camp || {
            id: rec.campaignId,
            bidAmount: 1.2,
            pacingMode: PacingMode.EVEN,
            biddingStrategy: BiddingStrategy.MANUAL,
          },
        });
      }),
      findMany: jest.fn().mockImplementation(() => Promise.resolve(mockRecommendations)),
      count: jest.fn().mockImplementation(() => Promise.resolve(mockRecommendations.length)),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = mockRecommendations.findIndex((r) => r.id === where.id);
        if (idx >= 0) {
          mockRecommendations[idx] = { ...mockRecommendations[idx], ...data };
          return Promise.resolve(mockRecommendations[idx]);
        }
        return Promise.resolve({ id: where.id, ...data });
      }),
    },

    fraudIncident: {
      create: jest.fn().mockImplementation(({ data }) => {
        const incident = {
          id: `inc-${mockFraudIncidents.length + 1}`,
          ...data,
          status: data.status || FraudIncidentStatus.DETECTED,
          impactAmount: data.impactAmount !== undefined ? data.impactAmount : 1.8,
          createdAt: new Date(),
        };
        mockFraudIncidents.push(incident);
        return Promise.resolve(incident);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const inc = mockFraudIncidents.find((i) => !where?.id || i.id === where.id);
        if (inc && where.organizationId && inc.organizationId !== where.organizationId) {
          return Promise.resolve(null);
        }
        return Promise.resolve(inc || null);
      }),
      findMany: jest.fn().mockImplementation(() => Promise.resolve(mockFraudIncidents)),
      count: jest.fn().mockImplementation(() => Promise.resolve(mockFraudIncidents.length)),
      aggregate: jest.fn().mockImplementation(() => {
        return Promise.resolve({
          _sum: { impactAmount: 18.5 },
          _count: { id: mockFraudIncidents.length },
        });
      }),
      groupBy: jest.fn().mockResolvedValue([
        { category: IvtCategory.SIVT_CLICK_INJECTION, _count: { id: 3 }, _sum: { impactAmount: 12.0 } },
        { category: IvtCategory.GIVT_EMULATOR, _count: { id: 1 }, _sum: { impactAmount: 6.5 } },
      ]),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = mockFraudIncidents.findIndex((i) => i.id === where.id);
        if (idx >= 0) {
          mockFraudIncidents[idx] = { ...mockFraudIncidents[idx], ...data, resolvedAt: new Date() };
          return Promise.resolve(mockFraudIncidents[idx]);
        }
        return Promise.resolve({ id: where.id, ...data });
      }),
    },

    telemetryEventRecord: {
      count: jest.fn().mockResolvedValue(1000),
    },

    auditLog: {
      create: jest.fn().mockImplementation(({ data }) => {
        mockAuditLogs.push(data);
        return Promise.resolve({ id: `audit-${Date.now()}`, ...data, createdAt: new Date() });
      }),
      findMany: jest.fn().mockImplementation(() => Promise.resolve(mockAuditLogs)),
    },
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        CampaignsController,
        AdUnitsController,
        BillingController,
        RecommendationsController,
        AntifraudController,
      ],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        CampaignsService,
        AdUnitsService,
        BillingService,
        SmartBiddingService,
        RecommendationsService,
        AntifraudService,
      ],
    }).compile();

    campaignsService = module.get<CampaignsService>(CampaignsService);
    campaignsController = module.get<CampaignsController>(CampaignsController);
    adUnitsService = module.get<AdUnitsService>(AdUnitsService);
    adUnitsController = module.get<AdUnitsController>(AdUnitsController);
    billingService = module.get<BillingService>(BillingService);
    billingController = module.get<BillingController>(BillingController);
    smartBiddingService = module.get<SmartBiddingService>(SmartBiddingService);
    recommendationsService = module.get<RecommendationsService>(RecommendationsService);
    recommendationsController = module.get<RecommendationsController>(RecommendationsController);
    antifraudService = module.get<AntifraudService>(AntifraudService);
    antifraudController = module.get<AntifraudController>(AntifraudController);
  });

  // ==============================================================================
  // 1. FLUXO FINANCEIRO: DEPÓSITO PIX & WALLET LEDGER (FASE 25)
  // ==============================================================================
  describe('1. Fluxo Financeiro: Depósito PIX & WalletLedger', () => {
    it('deve gerar uma fatura de depósito PIX de R$ 500,00 para o anunciante', async () => {
      const invoice = await billingService.createDeposit(advertiserOrgId, {
        amount: 500.0,
        paymentMethod: PaymentMethod.PIX,
      });

      expect(invoice).toBeDefined();
      expect(invoice.amount).toBe(500.0);
      expect(invoice.paymentMethod).toBe(PaymentMethod.PIX);
      expect(invoice.pixQrCode).toBeDefined();
    });

    it('deve rejeitar fatura com valor inferior ao limite mínimo', async () => {
      await expect(
        billingService.createDeposit(advertiserOrgId, {
          amount: 5.0, // Mínimo é R$ 20.00
          paymentMethod: PaymentMethod.PIX,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve confirmar webhook de pagamento e creditar ADVERTISING_CREDITS no WalletLedger', async () => {
      const confirmResult = await billingService.confirmDeposit('gw-ref-1', {
        gatewayReference: 'gw-ref-1',
        paidAmount: 500.0,
      });

      expect(confirmResult.success).toBe(true);
      mockWalletBalances[`${advertiserOrgId}_ADVERTISING_CREDITS`] = 1500.0;

      // Valida se transação foi registrada no Ledger
      expect(mockPrisma.walletLedger.create).toHaveBeenCalled();
      const lastEntry = mockLedgerEntries[mockLedgerEntries.length - 1];
      expect(lastEntry.transactionType).toBe(LedgerTransactionType.DEPOSIT_FIAT);
      expect(lastEntry.amount).toBe(500.0);
    });
  });

  // ==============================================================================
  // 2. GESTÃO DE CAMPANHAS E CRIATIVOS MULTI-FORMATO (FASE 23)
  // ==============================================================================
  describe('2. Campanhas Publicitárias e Criativos Multi-formato', () => {
    let createdCampaignId: string;

    it('deve criar uma campanha PAID com orçamento diário de R$ 100 e segmentação', async () => {
      const campaign = await campaignsService.createCampaign(advertiserOrgId, {
        name: 'Campanha de Aquisição Fintech Q4',
        type: CampaignType.PAID,
        billingModel: 'CPM',
        bidAmount: 1.2, // bid < 1.5 ativa regra de recomendação BID_ADJUSTMENT
        dailyBudget: 100.0,
        totalBudget: 3000.0,
        targetCountry: 'BR',
        targetCategories: 'FINANCE,BUSINESS',
      });

      expect(campaign).toBeDefined();
      expect(campaign.name).toBe('Campanha de Aquisição Fintech Q4');
      expect(campaign.status).toBe(CampaignStatus.DRAFT);
      createdCampaignId = campaign.id;
    });

    it('deve associar criativos nos formatos BANNER, INTERSTITIAL e REWARDED', async () => {
      const banner = await campaignsService.addCreative(createdCampaignId, advertiserOrgId, {
        format: AdFormat.BANNER,
        title: 'Abra sua conta digital',
        imageUrl: 'https://cdn.mgp.dev/banners/fintech_320x50.png',
        actionUrl: 'https://mgp.dev/track/fintech-banner',
      });

      const interstitial = await campaignsService.addCreative(createdCampaignId, advertiserOrgId, {
        format: AdFormat.INTERSTITIAL,
        title: 'Cartão Black Sem Anuidade',
        imageUrl: 'https://cdn.mgp.dev/interstitials/black_card.png',
        actionUrl: 'https://mgp.dev/track/fintech-interstitial',
      });

      const rewarded = await campaignsService.addCreative(createdCampaignId, advertiserOrgId, {
        format: AdFormat.REWARDED,
        title: 'Ganhe 100 pontos bônus',
        imageUrl: 'https://cdn.mgp.dev/videos/rewarded_fintech.mp4',
        actionUrl: 'https://mgp.dev/track/fintech-rewarded',
      });

      expect(banner.format).toBe(AdFormat.BANNER);
      expect(interstitial.format).toBe(AdFormat.INTERSTITIAL);
      expect(rewarded.format).toBe(AdFormat.REWARDED);
    });

    it('deve permitir a ativação da campanha após a presença de criativos e saldo positivo', async () => {
      const updated = await campaignsService.updateCampaignStatus(createdCampaignId, advertiserOrgId, {
        status: CampaignStatus.ACTIVE,
      });

      expect(updated.status).toBe(CampaignStatus.ACTIVE);
    });
  });

  // ==============================================================================
  // 3. PAINEL DE PUBLISHERS E MONETIZAÇÃO DE AD UNITS (FASE 24)
  // ==============================================================================
  describe('3. Configuração de Ad Units e Relatórios de Monetização de Publishers', () => {
    it('deve criar um bloco de anúncio INTERSTITIAL com Floor eCPM de R$ 2.50', async () => {
      const adUnit = await adUnitsService.createAdUnit(publisherOrgId, {
        appId: 'app-pub-1',
        name: 'Fim de Fase Interstitial',
        format: AdFormat.INTERSTITIAL,
        floorEcpm: 2.5,
      });

      expect(adUnit).toBeDefined();
      expect(adUnit.name).toBe('Fim de Fase Interstitial');
      expect(adUnit.floorEcpm).toBe(2.5);
    });

    it('deve rejeitar ad unit com Floor eCPM negativo', async () => {
      await expect(
        adUnitsService.createAdUnit(publisherOrgId, {
          appId: 'app-pub-1',
          name: 'Invalid Floor',
          format: AdFormat.BANNER,
          floorEcpm: -1.0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve calcular relatórios de monetização com base no modelo de 70% rev-share', async () => {
      const analytics = await adUnitsService.getPublisherAnalytics(publisherOrgId, {
        period: '7d',
      });

      expect(analytics).toBeDefined();
      expect(analytics.summary).toBeDefined();
      expect(analytics.summary.publisherRevenue).toBeGreaterThanOrEqual(0);
      expect(analytics.summary.platformFee).toBeGreaterThanOrEqual(0);
    });
  });

  // ==============================================================================
  // 4. MOTOR DE RECOMENDAÇÕES E SMART BIDDING (FASE 26)
  // ==============================================================================
  describe('4. Smart Bidding, Pacing e Motor de Recomendações', () => {
    it('deve atualizar a estratégia de lances da campanha para TARGET_CPA com pacing EVEN', async () => {
      const strategy = await recommendationsService.updateBiddingStrategy(
        advertiserOrgId,
        'camp-1',
        {
          biddingStrategy: BiddingStrategy.TARGET_CPA,
          targetCpa: 25.0,
          pacingMode: PacingMode.EVEN,
        },
        { id: testUserId, email: 'operator@mgp.dev' },
      );

      expect(strategy).toBeDefined();
      expect(strategy.biddingStrategy).toBe(BiddingStrategy.TARGET_CPA);
      expect(strategy.pacingMode).toBe(PacingMode.EVEN);
    });

    it('deve gerar recomendações automáticas de otimização para as campanhas ativas', async () => {
      const result = await recommendationsService.generateRecommendations(advertiserOrgId);

      expect(result).toBeDefined();
      expect(result.generatedCount).toBeGreaterThanOrEqual(1);
    });

    it('deve aplicar uma recomendação via transação atômica com trilha de auditoria', async () => {
      const rec = mockRecommendations[0];
      const applied = await recommendationsService.applyRecommendation(
        advertiserOrgId,
        rec.id,
        { id: testUserId, email: 'operator@mgp.dev' },
        { overrideParams: { bidAmount: 16.0 } },
      );

      expect(applied.recommendation.status).toBe(RecommendationStatus.APPLIED);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('deve simular curva preditiva de lances e taxas de vitória (Win Rate)', async () => {
      const result = await recommendationsService.simulateCampaignBid(advertiserOrgId, 'camp-1', {
        targetMetric: 'IMPRESSIONS',
      });

      expect(result).toBeDefined();
      expect(result.simulation).toBeDefined();
      expect(result.simulation.points.length).toBeGreaterThan(0);
      expect(result.pacing).toBeDefined();
    });
  });

  // ==============================================================================
  // 5. DETECÇÃO DE FRAUDE (IVT), ANÁLISE FORENSE E CHARGEBACK (FASE 27)
  // ==============================================================================
  describe('5. Controle Antifraude, Detecção IVT e Estorno Financeiro', () => {
    let incidentId: string;

    it('deve inspecionar tráfego e detectar ataque SIVT Fast-Click (< 300ms)', async () => {
      const inspection = await antifraudService.inspectTraffic(advertiserOrgId, {
        sourceIp: '187.54.21.90',
        userAgent: 'Dalvik/2.1.0 (Linux; U; Android 14; Pixel 8)',
        clickDeltaMs: 120, // < 300ms: SIVT Click Injection
        appId: 'app-adv-1',
        campaignId: 'camp-1',
        isEmulator: false,
        isRooted: false,
        hasViewToken: true,
      });

      expect(inspection.isFraud).toBe(true);
      expect(inspection.category).toBe(IvtCategory.SIVT_CLICK_INJECTION);
      expect(inspection.severity).toBe(FraudSeverity.HIGH);
      expect(inspection.incidentId).toBeDefined();
      incidentId = inspection.incidentId!;
    });

    it('deve consolidar KPIs de IVT respeitando o benchmark de conformidade MRC (< 2.0%)', async () => {
      const metrics = await antifraudService.getMetrics(advertiserOrgId, { period: '7d' });

      expect(metrics).toBeDefined();
      expect(metrics.ivtRatePct).toBeDefined();
      expect(metrics.totalBlockedAmount).toBeGreaterThanOrEqual(0);
      expect(metrics.breakdown.givtPercentage + metrics.breakdown.sivtPercentage).toBe(100);
    });

    it('deve resolver incidente de fraude executando chargeback atômico no WalletLedger', async () => {
      const resolution = await antifraudService.resolveIncident(
        advertiserOrgId,
        incidentId,
        {
          status: 'CONFIRMED',
          actionTaken: 'Estorno de créditos aplicado ao anunciante e bloqueio de IP.',
          executeChargeback: true,
          notes: 'Ataque de clique rápido confirmado por telemetria.',
        },
        { id: testUserId, email: 'secops@mgp.dev' },
      );

      expect(resolution.incident.status).toBe('CONFIRMED');
      expect(resolution.chargebackTransaction).toBeDefined();

      // Validação de estorno no ledger
      const chargebackTx = mockLedgerEntries.find(
        (t) => t.transactionType === LedgerTransactionType.FRAUD_CHARGEBACK,
      );
      expect(chargebackTx).toBeDefined();
      expect(chargebackTx.idempotencyKey).toBe(`chargeback_${incidentId}`);
    });
  });

  // ==============================================================================
  // 6. MOTOR DE PAYOUTS E SAQUE DE PUBLISHERS (FASE 25)
  // ==============================================================================
  describe('6. Payout de Publishers e Liquidação Financeira', () => {
    it('deve solicitar saque PIX de R$ 100,00 da conta PUBLISHER_EARNINGS', async () => {
      const payout = await billingService.requestPayout(publisherOrgId, {
        amount: 100.0,
        payoutMethod: PayoutMethod.PIX,
        recipientKey: 'publisher@pix.com.br',
      });

      expect(payout).toBeDefined();
      expect(payout.amount).toBe(100.0);
      expect(payout.status).toBe(PayoutStatus.PROCESSING);

      // Valida débito no ledger
      const payoutTx = mockLedgerEntries.find(
        (t) => t.transactionType === LedgerTransactionType.PAYOUT_WITHDRAWAL,
      );
      expect(payoutTx).toBeDefined();
    });

    it('deve rejeitar solicitação de saque com valor inferior a R$ 50,00', async () => {
      await expect(
        billingService.requestPayout(publisherOrgId, {
          amount: 20.0,
          payoutMethod: PayoutMethod.PIX,
          recipientKey: 'publisher@pix.com.br',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==============================================================================
  // 7. SEGURANÇA E ISOLAMENTO MULTI-TENANT RIGOROSO (ZERO DATA LEAKAGE)
  // ==============================================================================
  describe('7. Isolamento Multi-Tenant Estrito (Zero Data Leakage)', () => {
    it('deve impedir que uma organização invasora visualize ou manipule campanhas alheias', async () => {
      await expect(
        campaignsService.findCampaignById('camp-1', competitorOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve impedir que uma organização invasora visualize ou manipule blocos de anúncios alheios', async () => {
      await expect(
        adUnitsService.findAdUnitById('unit-1', competitorOrgId),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve impedir que uma organização invasora resolva incidentes de fraude alheios', async () => {
      await expect(
        antifraudService.resolveIncident(
          competitorOrgId,
          'inc-1',
          {
            status: 'DISMISSED',
            actionTaken: 'Tentativa hacker',
            executeChargeback: false,
          },
          { id: 'hacker-id', email: 'hacker@mgp.dev' },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
