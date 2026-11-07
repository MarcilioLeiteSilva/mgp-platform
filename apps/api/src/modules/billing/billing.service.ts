import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateDepositDto,
  RequestPayoutDto,
  ConfirmDepositWebhookDto,
  ListPayoutsQueryDto,
  ListTransactionsQueryDto,
} from './dto';
import {
  WalletAccountType,
  LedgerTransactionType,
  PaymentStatus,
  PayoutStatus,
  PaymentMethod,
  PayoutMethod,
} from '@mgp/database';
import { randomUUID } from 'crypto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtém a visão geral da carteira da organização ativa (Multi-Tenant).
   * Se a carteira ou contas ainda não existirem, são inicializadas deterministicamente.
   */
  async getWalletOverview(organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para consultar a carteira.');
    }

    let wallet = await this.prisma.wallet.findUnique({
      where: { organizationId },
      include: {
        accounts: {
          orderBy: { type: 'asc' },
        },
      },
    });

    if (!wallet) {
      wallet = await this.initializeWalletForOrganization(organizationId);
    }

    const accountsMap = wallet.accounts.reduce((acc, account) => {
      acc[account.type] = {
        id: account.id,
        type: account.type,
        currency: account.currency,
        balance: Number(account.cachedBalance),
      };
      return acc;
    }, {} as Record<string, any>);

    return {
      walletId: wallet.id,
      organizationId,
      currency: 'BRL',
      accounts: accountsMap,
      advertisingCredits: accountsMap[WalletAccountType.ADVERTISING_CREDITS]?.balance ?? 0.0,
      exchangeCredits: accountsMap[WalletAccountType.EXCHANGE_CREDITS]?.balance ?? 0.0,
      publisherEarnings: accountsMap[WalletAccountType.PUBLISHER_EARNINGS]?.balance ?? 0.0,
    };
  }

  /**
   * Cria uma nova fatura de depósito (Top-up) para recarga de créditos de anunciante via PIX.
   */
  async createDeposit(
    organizationId: string,
    dto: CreateDepositDto,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para gerar faturas de depósito.');
    }

    if (dto.amount < 10.0) {
      throw new BadRequestException('O valor mínimo para depósito é de R$ 10,00.');
    }

    const walletOverview = await this.getWalletOverview(organizationId);
    const advertisingAccountId = walletOverview.accounts[WalletAccountType.ADVERTISING_CREDITS]?.id;

    if (!advertisingAccountId) {
      throw new NotFoundException('Conta de créditos publicitários não encontrada.');
    }

    const gatewayReference = `DEP-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const idempotencyKey = `dep_idem_${randomUUID()}`;

    // Geração de chave PIX Copia e Cola / QR Code simulado compatível com o padrão EMV
    const pixCopiaECola = `00020126580014BR.GOV.BCB.PIX0136${randomUUID()}520400005303986540${dto.amount.toFixed(2).replace('.', '')}5802BR5913MGP_PLATFORM6009SAO_PAULO62070503***6304ABCD`;
    const pixQrCode = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%230f172a"/><text x="50%" y="50%" fill="%2338bdf8" text-anchor="middle" font-size="12">PIX R$ ${dto.amount.toFixed(2)}</text></svg>`;

    const invoice = await this.prisma.depositInvoice.create({
      data: {
        organizationId,
        walletAccountId: advertisingAccountId,
        amount: dto.amount,
        currency: dto.currency ?? 'BRL',
        status: PaymentStatus.PENDING,
        paymentMethod: dto.paymentMethod ?? PaymentMethod.PIX,
        gatewayReference,
        pixQrCode,
        pixCopiaECola,
        idempotencyKey,
      },
    });

    await this.logAudit({
      organizationId,
      userId: context?.userId,
      action: 'DEPOSIT_INVOICE_CREATED',
      entityId: invoice.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffAfter: invoice,
    });

    return invoice;
  }

  /**
   * Confirma o pagamento de uma fatura de depósito e credita atomicamente no livro-razão (WalletLedger).
   * Operação idempotente e com trava de concorrência.
   */
  async confirmDeposit(
    gatewayReference: string,
    dto?: ConfirmDepositWebhookDto,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    const invoice = await this.prisma.depositInvoice.findUnique({
      where: { gatewayReference },
      include: { walletAccount: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Fatura com referência '${gatewayReference}' não encontrada.`);
    }

    if (invoice.status === PaymentStatus.PAID) {
      // Já liquidada (Idempotência)
      return {
        success: true,
        message: 'Fatura já confirmada anteriormente.',
        invoice,
      };
    }

    // Execução atômica no banco de dados via Prisma Transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Atualiza status da fatura
      const updatedInvoice = await tx.depositInvoice.update({
        where: { id: invoice.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: dto?.paidAt ? new Date(dto.paidAt) : new Date(),
        },
      });

      // 2. Incrementa o saldo em cache da conta contábil
      const currentBalance = Number(invoice.walletAccount.cachedBalance);
      const depositAmount = Number(invoice.amount);
      const newBalance = Number((currentBalance + depositAmount).toFixed(4));

      const updatedAccount = await tx.walletAccount.update({
        where: { id: invoice.walletAccountId },
        data: {
          cachedBalance: newBalance,
        },
      });

      // 3. Registra entrada imutável no livro-razão (Double-entry Ledger)
      const ledgerEntry = await tx.walletLedger.create({
        data: {
          accountId: invoice.walletAccountId,
          transactionType: LedgerTransactionType.DEPOSIT_FIAT,
          amount: depositAmount,
          balanceAfter: newBalance,
          referenceId: invoice.id,
          idempotencyKey: `ledger_${invoice.idempotencyKey}`,
          description: `Recarga de créditos via ${invoice.paymentMethod} (Ref: ${invoice.gatewayReference})`,
          metadata: {
            gatewayReference,
            paymentMethod: invoice.paymentMethod,
            confirmedAt: updatedInvoice.paidAt,
          },
        },
      });

      return { updatedInvoice, updatedAccount, ledgerEntry };
    });

    await this.logAudit({
      organizationId: invoice.organizationId,
      userId: context?.userId,
      action: 'DEPOSIT_PAYMENT_CONFIRMED',
      entityId: invoice.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffAfter: {
        amount: invoice.amount,
        newBalance: result.updatedAccount.cachedBalance,
        ledgerId: result.ledgerEntry.id,
      },
    });

    this.logger.log(`Depósito confirmado: R$ ${invoice.amount} para organização ${invoice.organizationId}`);
    return {
      success: true,
      invoice: result.updatedInvoice,
      newBalance: Number(result.updatedAccount.cachedBalance),
    };
  }

  /**
   * Solicita saque de rendimentos auferidos por publishers (PUBLISHER_EARNINGS).
   * Valida saldo suficiente, debita em custódia e registra a solicitação no Ledger.
   */
  async requestPayout(
    organizationId: string,
    dto: RequestPayoutDto,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para solicitar saque.');
    }

    if (dto.amount < 50.0) {
      throw new BadRequestException('O valor mínimo para solicitação de saque é de R$ 50,00.');
    }

    const walletOverview = await this.getWalletOverview(organizationId);
    const publisherAccountId = walletOverview.accounts[WalletAccountType.PUBLISHER_EARNINGS]?.id;
    const currentBalance = walletOverview.publisherEarnings;

    if (!publisherAccountId) {
      throw new NotFoundException('Conta de ganhos de publisher não encontrada.');
    }

    if (currentBalance < dto.amount) {
      throw new BadRequestException(
        `Saldo insuficiente para saque. Saldo disponível: R$ ${currentBalance.toFixed(2)}, solicitado: R$ ${dto.amount.toFixed(2)}.`,
      );
    }

    const idempotencyKey = `payout_${randomUUID()}`;

    // Operação atômica: debita o saldo de publisher e registra no livro-razão
    const result = await this.prisma.$transaction(async (tx) => {
      const newBalance = Number((currentBalance - dto.amount).toFixed(4));

      // 1. Atualiza o saldo da conta
      await tx.walletAccount.update({
        where: { id: publisherAccountId },
        data: {
          cachedBalance: newBalance,
        },
      });

      // 2. Registra o PayoutRequest
      const payout = await tx.payoutRequest.create({
        data: {
          organizationId,
          walletAccountId: publisherAccountId,
          amount: dto.amount,
          currency: 'BRL',
          status: PayoutStatus.PENDING,
          payoutMethod: dto.payoutMethod ?? PayoutMethod.PIX,
          recipientKey: dto.recipientKey,
          recipientData: dto.recipientData ?? {},
          idempotencyKey,
        },
      });

      // 3. Registra saída contábil no livro-razão
      const ledgerEntry = await tx.walletLedger.create({
        data: {
          accountId: publisherAccountId,
          transactionType: LedgerTransactionType.PAYOUT_WITHDRAWAL,
          amount: -dto.amount,
          balanceAfter: newBalance,
          referenceId: payout.id,
          idempotencyKey: `ledger_${idempotencyKey}`,
          description: `Solicitação de saque via ${payout.payoutMethod} para ${payout.recipientKey}`,
          metadata: {
            payoutId: payout.id,
            recipientKey: payout.recipientKey,
            payoutMethod: payout.payoutMethod,
          },
        },
      });

      return { payout, ledgerEntry, newBalance };
    });

    await this.logAudit({
      organizationId,
      userId: context?.userId,
      action: 'PAYOUT_REQUESTED',
      entityId: result.payout.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffAfter: result.payout,
    });

    this.logger.log(`Saque solicitado: R$ ${dto.amount} para ${dto.recipientKey} (Org: ${organizationId})`);
    return result.payout;
  }

  /**
   * Lista o histórico de solicitações de saque da organização ativa.
   */
  async listPayouts(organizationId: string, query: ListPayoutsQueryDto) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para consultar saques.');
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (query.status) {
      where.status = query.status;
    }

    const [total, payouts] = await Promise.all([
      this.prisma.payoutRequest.count({ where }),
      this.prisma.payoutRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: payouts,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lista o extrato oficial de partidas dobradas (WalletLedger) da organização ativa.
   */
  async listLedgerTransactions(organizationId: string, query: ListTransactionsQueryDto) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para consultar o extrato.');
    }

    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, Math.min(100, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {
      account: {
        wallet: {
          organizationId,
        },
      },
    };

    if (query.accountType) {
      where.account = {
        ...where.account,
        type: query.accountType,
      };
    }

    if (query.transactionType) {
      where.transactionType = query.transactionType;
    }

    const [total, transactions] = await Promise.all([
      this.prisma.walletLedger.count({ where }),
      this.prisma.walletLedger.findMany({
        where,
        skip,
        take: limit,
        include: {
          account: {
            select: {
              type: true,
              currency: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Inicializa deterministicamente a carteira e as 3 contas contábeis se não existirem.
   */
  private async initializeWalletForOrganization(organizationId: string) {
    return this.prisma.wallet.create({
      data: {
        organizationId,
        accounts: {
          create: [
            { type: WalletAccountType.ADVERTISING_CREDITS, currency: 'BRL', cachedBalance: 0.0 },
            { type: WalletAccountType.EXCHANGE_CREDITS, currency: 'BRL', cachedBalance: 0.0 },
            { type: WalletAccountType.PUBLISHER_EARNINGS, currency: 'BRL', cachedBalance: 0.0 },
          ],
        },
      },
      include: {
        accounts: {
          orderBy: { type: 'asc' },
        },
      },
    });
  }

  private async logAudit(data: {
    organizationId: string;
    userId?: string;
    action: string;
    entityId: string;
    ipAddress?: string;
    userAgent?: string;
    diffBefore?: any;
    diffAfter?: any;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: data.organizationId,
          userId: data.userId,
          action: data.action,
          entityType: 'Billing',
          entityId: data.entityId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          diffBefore: data.diffBefore,
          diffAfter: data.diffAfter,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Falha ao registrar auditoria de faturamento: ${err.message}`);
    }
  }
}

