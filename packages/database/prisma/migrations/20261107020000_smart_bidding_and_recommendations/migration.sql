-- CreateEnum
CREATE TYPE "BiddingStrategy" AS ENUM ('MANUAL', 'TARGET_CPA', 'MAX_CLICKS', 'MAX_IMPRESSIONS', 'SMART_PACING');

-- CreateEnum
CREATE TYPE "PacingMode" AS ENUM ('ACCELERATED', 'EVEN', 'SMART_DYNAMIC');

-- CreateEnum
CREATE TYPE "RecommendationType" AS ENUM ('BID_ADJUSTMENT', 'PACING_OPTIMIZATION', 'BUDGET_SCALING', 'CREATIVE_FATIGUE', 'AUDIENCE_EXPANSION');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PENDING', 'APPLIED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "RecommendationPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "campaigns" 
ADD COLUMN "bidding_strategy" "BiddingStrategy" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "pacing_mode" "PacingMode" NOT NULL DEFAULT 'EVEN',
ADD COLUMN "target_cpa" DECIMAL(10,4),
ADD COLUMN "auto_optimize" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "campaign_recommendations" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "type" "RecommendationType" NOT NULL,
    "priority" "RecommendationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "suggested_action" TEXT NOT NULL,
    "expected_impact" TEXT NOT NULL,
    "action_payload" JSONB NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaign_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_recommendations_organization_id_status_idx" ON "campaign_recommendations"("organization_id", "status");

-- CreateIndex
CREATE INDEX "campaign_recommendations_campaign_id_status_idx" ON "campaign_recommendations"("campaign_id", "status");

-- AddForeignKey
ALTER TABLE "campaign_recommendations" ADD CONSTRAINT "campaign_recommendations_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
