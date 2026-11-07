-- CreateEnum
CREATE TYPE "IvtCategory" AS ENUM ('GIVT_BOT', 'GIVT_DATA_CENTER', 'GIVT_EMULATOR', 'SIVT_CLICK_SPAM', 'SIVT_CLICK_INJECTION', 'SIVT_AD_STACKING', 'SIVT_FAST_CLICK', 'SIVT_GEO_MISMATCH', 'SIVT_VIEWABILITY_FRAUD');

-- CreateEnum
CREATE TYPE "FraudSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FraudIncidentStatus" AS ENUM ('DETECTED', 'INVESTIGATING', 'CONFIRMED', 'DISMISSED', 'RESOLVED');

-- CreateTable
CREATE TABLE "fraud_incidents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "app_id" TEXT,
    "campaign_id" TEXT,
    "ad_unit_id" TEXT,
    "category" "IvtCategory" NOT NULL,
    "severity" "FraudSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "FraudIncidentStatus" NOT NULL DEFAULT 'DETECTED',
    "source_ip" TEXT,
    "device_fingerprint" TEXT,
    "evidence_payload" JSONB NOT NULL,
    "impact_amount" DECIMAL(10,4) NOT NULL DEFAULT 0.0,
    "action_taken" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fraud_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fraud_incidents_organization_id_status_idx" ON "fraud_incidents"("organization_id", "status");

-- CreateIndex
CREATE INDEX "fraud_incidents_category_severity_idx" ON "fraud_incidents"("category", "severity");

-- CreateIndex
CREATE INDEX "fraud_incidents_app_id_created_at_idx" ON "fraud_incidents"("app_id", "created_at");

-- AddForeignKey
ALTER TABLE "fraud_incidents" ADD CONSTRAINT "fraud_incidents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_incidents" ADD CONSTRAINT "fraud_incidents_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_incidents" ADD CONSTRAINT "fraud_incidents_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

