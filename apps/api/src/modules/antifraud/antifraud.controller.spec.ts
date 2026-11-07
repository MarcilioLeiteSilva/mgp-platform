import { Test, TestingModule } from '@nestjs/testing';
import { AntifraudController } from './antifraud.controller';
import { AntifraudService } from './antifraud.service';
import { FraudIncidentStatus } from '@mgp/shared';

describe('AntifraudController', () => {
  let controller: AntifraudController;
  let service: any;

  const orgId = 'org-tenant-1';

  beforeEach(async () => {
    service = {
      getMetrics: jest.fn().mockResolvedValue({
        period: '7d',
        totalEventsAnalyzed: 1000,
        totalIncidents: 8,
        ivtRatePct: 0.8,
        totalBlockedAmount: 14.4,
      }),
      listIncidents: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
      getIncidentById: jest.fn().mockResolvedValue({
        id: 'inc-1',
        impactAmount: 1.8,
      }),
      resolveIncident: jest.fn().mockResolvedValue({
        incident: { id: 'inc-1', status: FraudIncidentStatus.CONFIRMED },
        chargebackTransaction: { id: 'ledger-tx-1' },
      }),
      inspectTraffic: jest.fn().mockResolvedValue({
        isFraud: true,
        reason: 'Fast Click',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AntifraudController],
      providers: [{ provide: AntifraudService, useValue: service }],
    }).compile();

    controller = module.get<AntifraudController>(AntifraudController);
  });

  it('deve chamar getMetrics com o organizationId do tenant', async () => {
    const res = await controller.getMetrics(
      { period: '7d' },
      orgId,
      { tenant: { organizationId: orgId } },
    );

    expect(service.getMetrics).toHaveBeenCalledWith(orgId, { period: '7d' });
    expect(res.ivtRatePct).toBe(0.8);
  });

  it('deve chamar listIncidents com parâmetros de busca', async () => {
    const res = await controller.listIncidents(
      { page: 1, limit: 10 },
      orgId,
      { tenant: { organizationId: orgId } },
    );

    expect(service.listIncidents).toHaveBeenCalledWith(orgId, { page: 1, limit: 10 });
    expect(res.total).toBe(0);
  });

  it('deve chamar getIncidentById', async () => {
    const res = await controller.getIncidentById(
      'inc-1',
      orgId,
      { tenant: { organizationId: orgId } },
    );

    expect(service.getIncidentById).toHaveBeenCalledWith(orgId, 'inc-1');
    expect(res.id).toBe('inc-1');
  });

  it('deve chamar resolveIncident com usuário autenticado', async () => {
    const dto = {
      status: 'CONFIRMED' as const,
      actionTaken: 'Chargeback efetuado',
      executeChargeback: true,
    };

    const res = await controller.resolveIncident(
      'inc-1',
      dto,
      orgId,
      { tenant: { organizationId: orgId }, user: { id: 'usr-1', email: 'sec@mgp.local' } },
    );

    expect(service.resolveIncident).toHaveBeenCalledWith(
      orgId,
      'inc-1',
      dto,
      expect.objectContaining({ id: 'usr-1' }),
    );
    expect(res.incident.status).toBe(FraudIncidentStatus.CONFIRMED);
  });

  it('deve chamar simulateInspection', async () => {
    const dto = { clickDeltaMs: 120, hasViewToken: true };
    const res = await controller.simulateInspection(
      dto,
      orgId,
      { tenant: { organizationId: orgId } },
    );

    expect(service.inspectTraffic).toHaveBeenCalledWith(orgId, dto);
    expect(res.isFraud).toBe(true);
  });
});
