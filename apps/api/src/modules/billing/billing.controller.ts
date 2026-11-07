import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import {
  CreateDepositDto,
  RequestPayoutDto,
  ConfirmDepositWebhookDto,
  ListPayoutsQueryDto,
  ListTransactionsQueryDto,
} from './dto';

@ApiTags('Faturamento, Carteira & Payouts')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('wallet')
  @ApiOperation({
    summary: 'Consulta a visão geral e saldos das contas contábeis da organização',
    description: 'Retorna os saldos de Créditos Publicitários, Troca de Tráfego e Ganhos de Publisher.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 200, description: 'Saldos retornados com sucesso.' })
  async getWalletOverview(
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.billingService.getWalletOverview(organizationId);
  }

  @Post('deposits')
  @ApiOperation({
    summary: 'Gera uma fatura/cobrança de recarga de créditos de anunciante (PIX)',
    description: 'Cria uma fatura com chave PIX Copia e Cola e QR Code para pagamento imediato.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 201, description: 'Fatura de depósito gerada com sucesso.' })
  async createDeposit(
    @Body() dto: CreateDepositDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.billingService.createDeposit(organizationId, dto, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Post('deposits/:reference/confirm')
  @ApiOperation({
    summary: 'Webhook / Confirmação de liquidação de depósito pelo Gateway',
    description: 'Credita o saldo na conta de anunciante e gera lançamento no livro-razão (WalletLedger).',
  })
  @ApiParam({ name: 'reference', description: 'Código gatewayReference da fatura' })
  @ApiResponse({ status: 200, description: 'Depósito confirmado e creditado.' })
  async confirmDeposit(
    @Param('reference') gatewayReference: string,
    @Body() dto?: ConfirmDepositWebhookDto,
    @Req() req?: any,
  ) {
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.billingService.confirmDeposit(gatewayReference, dto, {
      ipAddress,
      userAgent,
    });
  }

  @Post('payouts')
  @ApiOperation({
    summary: 'Solicita saque de rendimentos auferidos por publishers (PUBLISHER_EARNINGS)',
    description: 'Valida se o saldo é suficiente, debita em custódia e agenda o repasse via PIX.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 201, description: 'Saque solicitado com sucesso.' })
  async requestPayout(
    @Body() dto: RequestPayoutDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.billingService.requestPayout(organizationId, dto, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Get('payouts')
  @ApiOperation({
    summary: 'Consulta o histórico de solicitações de saque da organização',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 200, description: 'Histórico de saques retornado.' })
  async listPayouts(
    @Query() query: ListPayoutsQueryDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.billingService.listPayouts(organizationId, query);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'Consulta o extrato do livro-razão financeiro (Double-Entry Ledger)',
    description: 'Retorna os lançamentos contábeis de partidas dobradas com filtro por conta contábil.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 200, description: 'Extrato do livro-razão retornado com sucesso.' })
  async listLedgerTransactions(
    @Query() query: ListTransactionsQueryDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.billingService.listLedgerTransactions(organizationId, query);
  }
}

