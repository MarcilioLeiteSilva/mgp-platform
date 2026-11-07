import { Test, TestingModule } from '@nestjs/testing';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaymentMethod, PayoutMethod, PayoutStatus } from '@mgp/database';

describe('BillingController', () => {
  let controller: BillingController;
  let service: jest.Mocked<BillingService>;

  const orgId = 'org-adv-123';
  const mockReq = {
    tenant: { organizationId: orgId },
    user: { id: 'user-1' },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Jest-Agent' },
  };

  beforeEach(async () => {
    const mockService = {
      getWalletOverview: jest.fn(),
      createDeposit: jest.fn(),
      confirmDeposit: jest.fn(),
      requestPayout: jest.fn(),
      listPayouts: jest.fn(),
      listLedgerTransactions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        {
          provide: BillingService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<BillingController>(BillingController);
    service = module.get(BillingService);
  });

  describe('getWalletOverview', () => {
    it('deve chamar service.getWalletOverview com o tenant do request', async () => {
      const overview = { walletId: 'w1', advertisingCredits: 100.0 };
      service.getWalletOverview.mockResolvedValue(overview as any);

      const result = await controller.getWalletOverview(undefined, mockReq);
      expect(service.getWalletOverview).toHaveBeenCalledWith(orgId);
      expect(result).toBe(overview);
    });
  });

  describe('createDeposit', () => {
    it('deve repassar criação de depósito com contexto de auditoria', async () => {
      const dto = { amount: 150.0, paymentMethod: PaymentMethod.PIX };
      const invoice = { id: 'inv-1', ...dto };
      service.createDeposit.mockResolvedValue(invoice as any);

      const result = await controller.createDeposit(dto, undefined, mockReq);
      expect(service.createDeposit).toHaveBeenCalledWith(orgId, dto, {
        userId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(invoice);
    });
  });

  describe('confirmDeposit', () => {
    it('deve repassar confirmação de depósito do gateway', async () => {
      const webhookDto = { gatewayReference: 'DEP-123', paidAmount: 150.0 };
      const confirmResult = { success: true, newBalance: 150.0 };
      service.confirmDeposit.mockResolvedValue(confirmResult as any);

      const result = await controller.confirmDeposit('DEP-123', webhookDto, mockReq);
      expect(service.confirmDeposit).toHaveBeenCalledWith('DEP-123', webhookDto, {
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(confirmResult);
    });
  });

  describe('requestPayout', () => {
    it('deve repassar solicitação de saque com contexto de auditoria', async () => {
      const dto = {
        amount: 80.0,
        payoutMethod: PayoutMethod.PIX,
        recipientKey: 'user@pix.com',
      };
      const payout = { id: 'payout-1', ...dto };
      service.requestPayout.mockResolvedValue(payout as any);

      const result = await controller.requestPayout(dto, undefined, mockReq);
      expect(service.requestPayout).toHaveBeenCalledWith(orgId, dto, {
        userId: 'user-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(payout);
    });
  });

  describe('listPayouts', () => {
    it('deve listar saques do tenant', async () => {
      const query = { page: 1, limit: 10, status: PayoutStatus.PENDING };
      const expected = { data: [], meta: { total: 0 } };
      service.listPayouts.mockResolvedValue(expected as any);

      const result = await controller.listPayouts(query, undefined, mockReq);
      expect(service.listPayouts).toHaveBeenCalledWith(orgId, query);
      expect(result).toBe(expected);
    });
  });

  describe('listLedgerTransactions', () => {
    it('deve listar transações do livro-razão', async () => {
      const query = { page: 1, limit: 20 };
      const expected = { data: [], meta: { total: 0 } };
      service.listLedgerTransactions.mockResolvedValue(expected as any);

      const result = await controller.listLedgerTransactions(query, undefined, mockReq);
      expect(service.listLedgerTransactions).toHaveBeenCalledWith(orgId, query);
      expect(result).toBe(expected);
    });
  });
});

