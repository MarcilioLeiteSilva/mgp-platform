-- CreateTable
CREATE TABLE "aso_app_estimates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "aso_app_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'br',
    "category" TEXT NOT NULL,
    "category_rank_basis" INTEGER,
    "daily_downloads_min" INTEGER NOT NULL,
    "daily_downloads_median" INTEGER NOT NULL,
    "daily_downloads_max" INTEGER NOT NULL,
    "monthly_downloads_min" INTEGER NOT NULL,
    "monthly_downloads_median" INTEGER NOT NULL,
    "monthly_downloads_max" INTEGER NOT NULL,
    "daily_revenue_min" DECIMAL(12,2) NOT NULL,
    "daily_revenue_median" DECIMAL(12,2) NOT NULL,
    "daily_revenue_max" DECIMAL(12,2) NOT NULL,
    "monthly_revenue_min" DECIMAL(12,2) NOT NULL,
    "monthly_revenue_median" DECIMAL(12,2) NOT NULL,
    "monthly_revenue_max" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "confidence_score" DECIMAL(5,2) NOT NULL,
    "calculation_method" TEXT NOT NULL DEFAULT 'POWER_LAW_PARETO_V1',
    "breakdown_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aso_app_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aso_app_estimates_organization_id_date_idx" ON "aso_app_estimates"("organization_id", "date");

-- CreateIndex
CREATE INDEX "aso_app_estimates_aso_app_id_date_idx" ON "aso_app_estimates"("aso_app_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "aso_app_estimates_aso_app_id_date_country_key" ON "aso_app_estimates"("aso_app_id", "date", "country");

-- AddForeignKey
ALTER TABLE "aso_app_estimates" ADD CONSTRAINT "aso_app_estimates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aso_app_estimates" ADD CONSTRAINT "aso_app_estimates_aso_app_id_fkey" FOREIGN KEY ("aso_app_id") REFERENCES "aso_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

