import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  WalletAccountType,
  PaymentStatus,
  PaymentMethod,
  PayoutStatus,
  PayoutMethod,
  LedgerTransactionType,
} from '@mgp/database';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;

  const orgId = 'org-adv-123';
  const walletId = 'wallet-xyz';
  const adAccountId = 'acc-ad-1';
  const pubAccountId = 'acc-pub-3';

  beforeEach(async () => {
    prisma = {
      wallet: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      depositInvoice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payoutRequest: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      walletAccount: {
        update: jest.fn(),
      },
      walletLedger: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('getWalletOverview', () => {
    it('deve lançar BadRequestException se organizationId não for fornecido', async () => {
      await expect(service.getWalletOverview('')).rejects.toThrow(BadRequestException);
    });

    it('deve retornar visão geral da carteira existente', async () => {
      const mockWallet = {
        id: walletId,
        organizationId: orgId,
        accounts: [
          { id: adAccountId, type: WalletAccountType.ADVERTISING_CREDITS, currency: 'BRL', cachedBalance: 250.0 },
          { id: 'acc-exch-2', type: WalletAccountType.EXCHANGE_CREDITS, currency: 'BRL', cachedBalance: 50.0 },
          { id: pubAccountId, type: WalletAccountType.PUBLISHER_EARNINGS, currency: 'BRL', cachedBalance: 120.0 },
        ],
      };
      prisma.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await service.getWalletOverview(orgId);

      expect(result.walletId).toBe(walletId);
      expect(result.advertisingCredits).toBe(250.0);
      expect(result.exchangeCredits).toBe(50.0);
      expect(result.publisherEarnings).toBe(120.0);
    });

    it('deve inicializar deterministicamente se a carteira não existir', async () => {
      prisma.wallet.findUnique.mockResolvedValue(null);
      const createdWallet = {
        id: 'new-wallet',
        organizationId: orgId,
        accounts: [
          { id: 'a1', type: WalletAccountType.ADVERTISING_CREDITS, currency: 'BRL', cachedBalance: 0 },
          { id: 'a2', type: WalletAccountType.EXCHANGE_CREDITS, currency: 'BRL', cachedBalance: 0 },
          { id: 'a3', type: WalletAccountType.PUBLISHER_EARNINGS, currency: 'BRL', cachedBalance: 0 },
        ],
      };
      prisma.wallet.create.mockResolvedValue(createdWallet);

      const result = await service.getWalletOverview(orgId);

      expect(prisma.wallet.create).toHaveBeenCalled();
      expect(result.advertisingCredits).toBe(0);
    });
  });

  describe('createDeposit', () => {
    it('deve rejeitar valor de depósito inferior a R$ 10,00', async () => {
      await expect(
        service.createDeposit(orgId, { amount: 5.0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve gerar fatura de depósito com PIX e registrar auditoria', async () => {
      const mockWallet = {
        id: walletId,
        organizationId: orgId,
        accounts: [
          { id: adAccountId, type: WalletAccountType.ADVERTISING_CREDITS, currency: 'BRL', cachedBalance: 0 },
          { id: 'a2', type: WalletAccountType.EXCHANGE_CREDITS, currency: 'BRL', cachedBalance: 0 },
          { id: 'a3', type: WalletAccountType.PUBLISHER_EARNINGS, currency: 'BRL', cachedBalance: 0 },
        ],
      };
      prisma.wallet.findUnique.mockResolvedValue(mockWallet);

      const createdInvoice = {
        id: 'inv-1',
        organizationId: orgId,
        walletAccountId: adAccountId,
        amount: 100.0,
        status: PaymentStatus.PENDING,
        gatewayReference: 'DEP-12345',
        pixCopiaECola: '0002012658...',
      };
      prisma.depositInvoice.create.mockResolvedValue(createdInvoice);

      const result = await service.createDeposit(orgId, { amount: 100.0 });

      expect(result).toEqual(createdInvoice);
      expect(prisma.depositInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: orgId,
            walletAccountId: adAccountId,
            amount: 100.0,
            status: PaymentStatus.PENDING,
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('confirmDeposit', () => {
    it('deve lançar NotFoundException se a referência da fatura não for encontrada', async () => {
      prisma.depositInvoice.findUnique.mockResolvedValue(null);

      await expect(service.confirmDeposit('INVALID_REF')).rejects.toThrow(NotFoundException);
    });

    it('deve liquidar fatura e creditar saldo atomicamente no WalletLedger', async () => {
      const invoice = {
        id: 'inv-1',
        organizationId: orgId,
        walletAccountId: adAccountId,
        amount: 150.0,
        status: PaymentStatus.PENDING,
        gatewayReference: 'DEP-999',
        paymentMethod: PaymentMethod.PIX,
        idempotencyKey: 'idem-inv-1',
        walletAccount: {
          id: adAccountId,
          cachedBalance: 50.0,
        },
      };
      prisma.depositInvoice.findUnique.mockResolvedValue(invoice);

      prisma.depositInvoice.update.mockResolvedValue({ ...invoice, status: PaymentStatus.PAID });
      prisma.walletAccount.update.mockResolvedValue({ id: adAccountId, cachedBalance: 200.0 });
      prisma.walletLedger.create.mockResolvedValue({ id: 'ledg-1' });

      const result = await service.confirmDeposit('DEP-999');

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(200.0);
      expect(prisma.walletAccount.update).toHaveBeenCalledWith({
        where: { id: adAccountId },
        data: { cachedBalance: 200.0 },
      });
      expect(prisma.walletLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountId: adAccountId,
            transactionType: LedgerTransactionType.DEPOSIT_FIAT,
            amount: 150.0,
            balanceAfter: 200.0,
          }),
        }),
      );
    });

    it('deve retornar mensagem idempotente se a fatura já estiver PAID', async () => {
      const invoice = {
        id: 'inv-1',
        status: PaymentStatus.PAID,
        walletAccount: { id: adAccountId, cachedBalance: 200.0 },
      };
      prisma.depositInvoice.findUnique.mockResolvedValue(invoice);

      const result = await service.confirmDeposit('DEP-ALREADY-PAID');

      expect(result.success).toBe(true);
      expect(result.message).toContain('já confirmada');
      expect(prisma.walletAccount.update).not.toHaveBeenCalled();
    });
  });

  describe('requestPayout', () => {
    it('deve rejeitar valor de saque inferior a R$ 50,00', async () => {
      await expect(
        service.requestPayout(orgId, {
          amount: 25.0,
          recipientKey: 'pix@test.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar solicitação se o saldo de publisher for menor que o valor solicitado', async () => {
      const mockWallet = {
        id: walletId,
        organizationId: orgId,
        accounts: [
          { id: adAccountId, type: WalletAccountType.ADVERTISING_CREDITS, currency: 'BRL', cachedBalance: 0 },
          { id: 'a2', type: WalletAccountType.EXCHANGE_CREDITS, currency: 'BRL', cachedBalance: 0 },
          { id: pubAccountId, type: WalletAccountType.PUBLISHER_EARNINGS, currency: 'BRL', cachedBalance: 60.0 },
        ],
      };
      prisma.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(
        service.requestPayout(orgId, {
          amount: 100.0,
          recipientKey: 'pix@test.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve debitar saldo e registrar PayoutRequest e WalletLedger com sucesso', async () => {
      const mockWallet = {
        id: walletId,
        organizationId: orgId,
        accounts: [
          { id: adAccountId, type: WalletAccountType.ADVERTISING_CREDITS, currency: 'BRL', cachedBalance: 0 },
          { id: 'a2', type: WalletAccountType.EXCHANGE_CREDITS, currency: 'BRL', cachedBalance: 0 },
          { id: pubAccountId, type: WalletAccountType.PUBLISHER_EARNINGS, currency: 'BRL', cachedBalance: 300.0 },
        ],
      };
      prisma.wallet.findUnique.mockResolvedValue(mockWallet);

      const createdPayout = {
        id: 'payout-1',
        organizationId: orgId,
        walletAccountId: pubAccountId,
        amount: 150.0,
        status: PayoutStatus.PENDING,
        recipientKey: 'pix@test.com',
      };
      prisma.payoutRequest.create.mockResolvedValue(createdPayout);
      prisma.walletAccount.update.mockResolvedValue({ id: pubAccountId, cachedBalance: 150.0 });
      prisma.walletLedger.create.mockResolvedValue({ id: 'ledg-out' });

      const result = await service.requestPayout(orgId, {
        amount: 150.0,
        recipientKey: 'pix@test.com',
        payoutMethod: PayoutMethod.PIX,
      });

      expect(result).toEqual(createdPayout);
      expect(prisma.walletAccount.update).toHaveBeenCalledWith({
        where: { id: pubAccountId },
        data: { cachedBalance: 150.0 },
      });
      expect(prisma.walletLedger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountId: pubAccountId,
            transactionType: LedgerTransactionType.PAYOUT_WITHDRAWAL,
            amount: -150.0,
            balanceAfter: 150.0,
          }),
        }),
      );
    });
  });

  describe('listPayouts & listLedgerTransactions', () => {
    it('listPayouts: deve listar saques com paginação', async () => {
      prisma.payoutRequest.count.mockResolvedValue(1);
      prisma.payoutRequest.findMany.mockResolvedValue([{ id: 'p1', amount: 100.0 }]);

      const result = await service.listPayouts(orgId, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });

    it('listLedgerTransactions: deve listar extrato do livro-razão', async () => {
      prisma.walletLedger.count.mockResolvedValue(2);
      prisma.walletLedger.findMany.mockResolvedValue([
        { id: 'l1', amount: 100.0, transactionType: LedgerTransactionType.DEPOSIT_FIAT },
        { id: 'l2', amount: -20.0, transactionType: LedgerTransactionType.CAMPAIGN_SPEND },
      ]);

      const result = await service.listLedgerTransactions(orgId, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });
  });
});

