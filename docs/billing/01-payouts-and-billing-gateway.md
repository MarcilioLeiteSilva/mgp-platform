# Motor de Payouts, Faturamento e Integração com Gateways de Pagamento

Este documento detalha a arquitetura, endpoints REST, contratos de dados, livro-razão contábil e rotinas de liquidação para faturamento de anunciantes e saques de publishers na **Mobile Growth Platform (MGP)**, entregue na **Etapa 4 — Fase 25**.

---

## 1. Visão Geral da Arquitetura

O módulo de Faturamento e Payouts conecta a camada financeira dos anunciantes e publishers ao sistema contábil de partidas dobradas (**Double-Entry Ledger**), fundamentado em três princípios inegociáveis:

1. **Segregação Estrita de Contas Contábeis (Zero Leakage):**
   - **`ADVERTISING_CREDITS`:** Saldo monetário de anunciantes, creditado exclusivamente via recargas PIX/cartão (`DEPOSIT_FIAT`) e consumido por impressões (`CAMPAIGN_SPEND`).
   - **`EXCHANGE_CREDITS`:** Saldo orgânico obtido por exibição de anúncios parceiros na rede orgânica. Não é passível de saque nem conversão em moeda fiduciária.
   - **`PUBLISHER_EARNINGS`:** Ganhos acumulados por publishers auferidos pela monetização de Ad Units via SDK. Disponível para saque imediato a partir de R$ 50,00 via PIX.

2. **Livro-Razão Contábil Imutável (`WalletLedger`):**
   - Nenhuma conta tem seu saldo alterado diretamente sem um lançamento correspondente no livro-razão.
   - Toda operação de crédito ou débito registra:
     - `accountId`
     - `transactionType` (`DEPOSIT_FIAT`, `PAYOUT_WITHDRAWAL`, `CAMPAIGN_SPEND`, etc.)
     - `amount` (+ para crédito, - para débito)
     - `balanceAfter` (saldo resultante após o lançamento)
     - `idempotencyKey` única para prevenção de duplicidade
     - Metadados completos do gateway/PIX.

3. **Operações Atômicas e Trava de Concorrência:**
   - Depósitos e Saques são processados dentro de transações atômicas no PostgreSQL (`prisma.$transaction`), garantindo que não haja inconsistência mesmo sob concorrência intensa.
   - Saques deduzem imediatamente o saldo do publisher e retêm em custódia até o repasse final pelo gateway.

---

## 2. Modelagem de Dados

### Modelo `DepositInvoice` (Prisma / PostgreSQL)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `String` (UUID) | Identificador único da fatura. |
| `organizationId` | `String` (UUID) | Tenant anunciante proprietário. |
| `walletAccountId`| `String` (UUID) | Conta de créditos publicitários (`ADVERTISING_CREDITS`). |
| `amount` | `Decimal` | Valor a ser creditado em BRL (mínimo R$ 10,00). |
| `status` | `PaymentStatus` | `PENDING`, `PAID`, `EXPIRED`, `FAILED`. |
| `paymentMethod` | `PaymentMethod` | `PIX`, `CREDIT_CARD`, `BOLETO`. |
| `gatewayReference`| `String` (Unique) | Código de conciliação único do gateway (ex: `DEP-12345`). |
| `pixCopiaECola` | `String?` | Código EMV PIX para cópia. |
| `pixQrCode` | `String?` | Imagem SVG / base64 do QR Code PIX. |
| `paidAt` | `DateTime?` | Data/hora de confirmação da liquidação. |
| `idempotencyKey` | `String` (Unique) | Chave anti-duplicação. |

### Modelo `PayoutRequest` (Prisma / PostgreSQL)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `String` (UUID) | Identificador da solicitação de saque. |
| `organizationId` | `String` (UUID) | Tenant publisher solicitante. |
| `walletAccountId`| `String` (UUID) | Conta de ganhos de publisher (`PUBLISHER_EARNINGS`). |
| `amount` | `Decimal` | Valor do saque em BRL (mínimo R$ 50,00). |
| `status` | `PayoutStatus` | `PENDING`, `PROCESSING`, `COMPLETED`, `REJECTED`, `CANCELLED`. |
| `payoutMethod` | `PayoutMethod` | `PIX`, `BANK_TRANSFER`, `STRIPE_CONNECT`. |
| `recipientKey` | `String` | Chave PIX (CPF/CNPJ/Email/Telefone/EVP) ou dados bancários. |
| `recipientData` | `Json?` | Metadados bancários do favorecido. |
| `idempotencyKey` | `String` (Unique) | Chave de idempotência do repasse. |

---

## 3. Endpoints da API REST (`/billing`)

| Método | Rota | Descrição | Status HTTP |
| :--- | :--- | :--- | :---: |
| `GET` | `/billing/wallet` | Retorna visão geral dos 3 saldos segregados da organização. | 200 |
| `POST` | `/billing/deposits` | Gera fatura de recarga com PIX Copia e Cola / QR Code. | 201 |
| `POST` | `/billing/deposits/:ref/confirm` | Webhook de confirmação de pagamento do gateway. | 200 |
| `POST` | `/billing/payouts` | Solicita saque de ganhos de publisher com débito em custódia. | 201 |
| `GET` | `/billing/payouts` | Histórico de solicitações de saque da organização. | 200 |
| `GET` | `/billing/transactions` | Extrato contábil de partidas dobradas do livro-razão. | 200 |

---

## 4. Fluxo de Liquidação Contábil (Atomicidade)

```
[Anunciante / Publisher]
        │
        ├─ (1) POST /billing/deposits ──► Gera DepositInvoice (Status PENDING)
        │                                  └─ Retorna QR Code & PIX Copia e Cola
        │
        ├─ (2) Gateway Webhook (ou Simulação)
        │       └─ POST /billing/deposits/:ref/confirm
        │           │
        │           ├─ tx.depositInvoice.update(status = PAID)
        │           ├─ tx.walletAccount.update(cachedBalance += amount)
        │           └─ tx.walletLedger.create(type = DEPOSIT_FIAT, balanceAfter)
        │
        └─ (3) POST /billing/payouts (Publisher)
                │
                ├─ Valida saldo >= amount (mínimo R$ 50,00)
                ├─ tx.walletAccount.update(cachedBalance -= amount)
                ├─ tx.payoutRequest.create(status = PENDING)
                └─ tx.walletLedger.create(type = PAYOUT_WITHDRAWAL, amount = -amount)
```

