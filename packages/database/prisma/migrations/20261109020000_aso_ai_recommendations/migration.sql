-- CreateEnum
CREATE TYPE "AsoAiRecommendationType" AS ENUM ('TITLE_OPTIMIZATION', 'DESCRIPTION_OPTIMIZATION', 'KEYWORD_EXPANSION', 'CAMPAIGN_STRATEGY', 'CREATIVE_COPY');

-- CreateEnum
CREATE TYPE "AsoAiRecommendationStatus" AS ENUM ('ACTIVE', 'APPLIED', 'DISMISSED');

-- CreateTable
CREATE TABLE "aso_ai_recommendations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "aso_app_id" TEXT,
    "type" "AsoAiRecommendationType" NOT NULL DEFAULT 'TITLE_OPTIMIZATION',
    "status" "AsoAiRecommendationStatus" NOT NULL DEFAULT 'ACTIVE',
    "category" TEXT,
    "target_keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "input_context" JSONB NOT NULL,
    "suggestions_json" JSONB NOT NULL,
    "model_used" TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    "applied_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aso_ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aso_ai_recommendations_organization_id_type_status_idx" ON "aso_ai_recommendations"("organization_id", "type", "status");

-- CreateIndex
CREATE INDEX "aso_ai_recommendations_aso_app_id_type_idx" ON "aso_ai_recommendations"("aso_app_id", "type");

-- AddForeignKey
ALTER TABLE "aso_ai_recommendations" ADD CONSTRAINT "aso_ai_recommendations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aso_ai_recommendations" ADD CONSTRAINT "aso_ai_recommendations_aso_app_id_fkey" FOREIGN KEY ("aso_app_id") REFERENCES "aso_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
