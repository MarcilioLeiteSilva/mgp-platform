import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AntifraudService } from './antifraud.service';
import { PrismaService } from '../../database/prisma.service';
import {
  FraudIncidentStatus,
  FraudSeverity,
  IvtCategory,
  LedgerTransactionType,
  WalletAccountType,
} from '@mgp/shared';

describe('AntifraudService', () => {
  let service: AntifraudService;
  let prisma: any;

  const orgId = 'org-tenant-1';
  const otherOrgId = 'org-tenant-other';

  const mockIncident = {
    id: 'inc-1',
    organizationId: orgId,
    appId: 'app-1',
    campaignId: 'camp-1',
    category: IvtCategory.SIVT_CLICK_INJECTION,
    severity: FraudSeverity.HIGH,
    status: FraudIncidentStatus.DETECTED,
    impactAmount: 1.8,
    evidencePayload: { clickDeltaMs: 120 },
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      fraudIncident: {
        create: jest.fn().mockResolvedValue(mockIncident),
        findMany: jest.fn().mockResolvedValue([mockIncident]),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({
          ...mockIncident,
          status: FraudIncidentStatus.CONFIRMED,
        }),
        count: jest.fn().mockResolvedValue(1),
      },
      telemetryEventRecord: {
        count: jest.fn().mockResolvedValue(250),
      },
      wallet: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'w-1',
          accounts: [
            {
              id: 'acc-adv-1',
              type: WalletAccountType.ADVERTISING_CREDITS,
              cachedBalance: 50.0,
            },
          ],
        }),
      },
      walletAccount: {
        update: jest.fn().mockResolvedValue({ id: 'acc-adv-1', cachedBalance: 51.8 }),
      },
      walletLedger: {
        create: jest.fn().mockResolvedValue({ id: 'ledger-tx-1' }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AntifraudService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AntifraudService>(AntifraudService);
  });

  describe('inspectTraffic', () => {
    it('deve detectar Click Injection quando o delta for inferior a 300ms', async () => {
      const result = await service.inspectTraffic(orgId, {
        clickDeltaMs: 150,
        hasViewToken: true,
      });

      expect(result.isFraud).toBe(true);
      expect(result.category).toBe(IvtCategory.SIVT_CLICK_INJECTION);
      expect(result.severity).toBe(FraudSeverity.HIGH);
      expect(prisma.fraudIncident.create).toHaveBeenCalled();
    });

    it('deve detectar Click Flooding quando a taxa exceder 15 cliques/min', async () => {
      const result = await service.inspectTraffic(orgId, {
        clicksPerMinute: 25,
        hasViewToken: true,
      });

      expect(result.isFraud).toBe(true);
      expect(result.category).toBe(IvtCategory.SIVT_CLICK_SPAM);
      expect(result.severity).toBe(FraudSeverity.CRITICAL);
    });

    it('deve detectar ambiente emulado com GIVT_EMULATOR', async () => {
      const result = await service.inspectTraffic(orgId, {
        isEmulator: true,
        hasViewToken: true,
      });

      expect(result.isFraud).toBe(true);
      expect(result.category).toBe(IvtCategory.GIVT_EMULATOR);
    });

    it('deve detectar clique sem token de visualização com SIVT_VIEWABILITY_FRAUD', async () => {
      const result = await service.inspectTraffic(orgId, {
        hasViewToken: false,
      });

      expect(result.isFraud).toBe(true);
      expect(result.category).toBe(IvtCategory.SIVT_VIEWABILITY_FRAUD);
      expect(result.severity).toBe(FraudSeverity.CRITICAL);
    });

    it('deve aprovar tráfego legítimo', async () => {
      const result = await service.inspectTraffic(orgId, {
        clickDeltaMs: 2500,
        clicksPerMinute: 2,
        isEmulator: false,
        isRooted: false,
        hasViewToken: true,
      });

      expect(result.isFraud).toBe(false);
      expect(prisma.fraudIncident.create).not.toHaveBeenCalled();
    });
  });

  describe('getMetrics', () => {
    it('deve calcular taxa de IVT, volume bloqueado e vetores de fraude', async () => {
      const metrics = await service.getMetrics(orgId, { period: '7d' });

      expect(metrics.totalIncidents).toBe(1);
      expect(metrics.ivtRatePct).toBeGreaterThan(0);
      expect(metrics.totalBlockedAmount).toBe(1.8);
      expect(metrics.breakdown.sivtCount).toBe(1);
      expect(metrics.breakdown.givtCount).toBe(0);
      expect(metrics.severity.HIGH).toBe(1);
      expect(metrics.topVectors).toHaveLength(1);
    });
  });

  describe('listIncidents', () => {
    it('deve listar incidentes com isolamento estrito de tenant (Zero Data Leakage)', async () => {
      const res = await service.listIncidents(orgId, { page: 1, limit: 10 });

      expect(prisma.fraudIncident.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId }),
        }),
      );
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
    });
  });

  describe('getIncidentById', () => {
    it('deve retornar detalhes do incidente pertencente ao tenant', async () => {
      prisma.fraudIncident.findFirst.mockResolvedValue(mockIncident);

      const res = await service.getIncidentById(orgId, 'inc-1');
      expect(res.id).toBe('inc-1');
    });

    it('deve lançar NotFoundException se o incidente for de outro tenant', async () => {
      prisma.fraudIncident.findFirst.mockResolvedValue(null);

      await expect(service.getIncidentById(otherOrgId, 'inc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resolveIncident', () => {
    it('deve resolver incidente com estorno no WalletLedger (Fraud Chargeback)', async () => {
      prisma.fraudIncident.findFirst.mockResolvedValue(mockIncident);

      const user = { id: 'usr-sec', email: 'sec@mgp.local' };
      const res = await service.resolveIncident(
        orgId,
        'inc-1',
        {
          status: 'CONFIRMED',
          actionTaken: 'Chargeback efetuado para o anunciante',
          executeChargeback: true,
        },
        user,
      );

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.fraudIncident.update).toHaveBeenCalledWith({
        where: { id: 'inc-1' },
        data: expect.objectContaining({
          status: FraudIncidentStatus.CONFIRMED,
          resolvedBy: 'usr-sec',
        }),
      });
      expect(prisma.walletAccount.update).toHaveBeenCalled();
      expect(prisma.walletLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            transactionType: LedgerTransactionType.FRAUD_CHARGEBACK,
            amount: 1.8,
            idempotencyKey: 'chargeback_inc-1',
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'FRAUD_INCIDENT_RESOLVED',
            entityType: 'FraudIncident',
          }),
        }),
      );
      expect(res.chargebackTransaction).toBeDefined();
    });
  });
});
