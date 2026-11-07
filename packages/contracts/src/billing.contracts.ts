import { z } from 'zod';
import {
  PaymentMethod,
  PaymentStatus,
  PayoutMethod,
  PayoutStatus,
  WalletAccountType,
  LedgerTransactionType,
} from '@mgp/shared';

export const PaymentMethodEnum = z.nativeEnum(PaymentMethod);
export const PaymentStatusEnum = z.nativeEnum(PaymentStatus);
export const PayoutMethodEnum = z.nativeEnum(PayoutMethod);
export const PayoutStatusEnum = z.nativeEnum(PayoutStatus);
export const WalletAccountTypeEnum = z.nativeEnum(WalletAccountType);
export const LedgerTransactionTypeEnum = z.nativeEnum(LedgerTransactionType);

/**
 * Contrato de criação de fatura de depósito (Top-up para anunciantes).
 */
export const CreateDepositInvoiceSchema = z.object({
  amount: z
    .number()
    .min(10.0, { message: 'O valor mínimo para depósito é de R$ 10,00.' })
    .max(100000.0, { message: 'O valor máximo para depósito é de R$ 100.000,00.' }),
  paymentMethod: PaymentMethodEnum.default(PaymentMethod.PIX),
  currency: z.string().default('BRL'),
});

export type CreateDepositInvoiceInput = z.infer<typeof CreateDepositInvoiceSchema>;

/**
 * Contrato de confirmação de pagamento via Webhook do Gateway.
 */
export const ConfirmDepositWebhookSchema = z.object({
  gatewayReference: z.string().min(1),
  paidAmount: z.number().positive(),
  paidAt: z.string().datetime().optional(),
  idempotencyKey: z.string().optional(),
});

export type ConfirmDepositWebhookInput = z.infer<typeof ConfirmDepositWebhookSchema>;

/**
 * Contrato de solicitação de saque (Payout para publishers).
 */
export const RequestPayoutSchema = z.object({
  amount: z
    .number()
    .min(50.0, { message: 'O valor mínimo para saque é de R$ 50,00.' })
    .max(50000.0, { message: 'O valor máximo por solicitação de saque é de R$ 50.000,00.' }),
  payoutMethod: PayoutMethodEnum.default(PayoutMethod.PIX),
  recipientKey: z
    .string()
    .min(3, { message: 'A chave de destino (ex: chave PIX) deve ter no mínimo 3 caracteres.' })
    .max(100),
  recipientData: z.record(z.any()).optional(),
});

export type RequestPayoutInput = z.infer<typeof RequestPayoutSchema>;

/**
 * Contrato de consulta de histórico de saques.
 */
export const ListPayoutsQuerySchema = z.object({
  status: PayoutStatusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListPayoutsQueryInput = z.infer<typeof ListPayoutsQuerySchema>;

/**
 * Contrato de consulta de extrato do livro-razão (WalletLedger).
 */
export const ListLedgerTransactionsQuerySchema = z.object({
  accountType: WalletAccountTypeEnum.optional(),
  transactionType: LedgerTransactionTypeEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type ListLedgerTransactionsQueryInput = z.infer<typeof ListLedgerTransactionsQuerySchema>;

