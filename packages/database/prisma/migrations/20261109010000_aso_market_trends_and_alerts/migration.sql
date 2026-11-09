-- CreateTable
CREATE TABLE "aso_market_trends" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'br',
    "date" TIMESTAMP(3) NOT NULL,
    "breakout_apps_json" JSONB NOT NULL,
    "trending_keywords_json" JSONB NOT NULL,
    "summary_metrics_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aso_market_trends_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aso_trend_alerts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "target_app_id" TEXT,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aso_trend_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aso_market_trends_category_date_idx" ON "aso_market_trends"("category", "date");

-- CreateIndex
CREATE UNIQUE INDEX "aso_market_trends_category_country_date_key" ON "aso_market_trends"("category", "country", "date");

-- CreateIndex
CREATE INDEX "aso_trend_alerts_organization_id_is_read_created_at_idx" ON "aso_trend_alerts"("organization_id", "is_read", "created_at");

-- AddForeignKey
ALTER TABLE "aso_trend_alerts" ADD CONSTRAINT "aso_trend_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

