-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('PIX', 'BANK_TRANSFER', 'STRIPE_CONNECT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIT_CARD', 'BOLETO');

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "wallet_account_id" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "payout_method" "PayoutMethod" NOT NULL DEFAULT 'PIX',
    "recipient_key" TEXT NOT NULL,
    "recipient_data" JSONB,
    "processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_invoices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "wallet_account_id" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'PIX',
    "gateway_reference" TEXT,
    "pix_qr_code" TEXT,
    "pix_copia_e_cola" TEXT,
    "paid_at" TIMESTAMP(3),
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payout_requests_idempotency_key_key" ON "payout_requests"("idempotency_key");
CREATE INDEX "payout_requests_organization_id_created_at_idx" ON "payout_requests"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_invoices_gateway_reference_key" ON "deposit_invoices"("gateway_reference");
CREATE UNIQUE INDEX "deposit_invoices_idempotency_key_key" ON "deposit_invoices"("idempotency_key");
CREATE INDEX "deposit_invoices_organization_id_created_at_idx" ON "deposit_invoices"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_wallet_account_id_fkey" FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_invoices" ADD CONSTRAINT "deposit_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deposit_invoices" ADD CONSTRAINT "deposit_invoices_wallet_account_id_fkey" FOREIGN KEY ("wallet_account_id") REFERENCES "wallet_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

