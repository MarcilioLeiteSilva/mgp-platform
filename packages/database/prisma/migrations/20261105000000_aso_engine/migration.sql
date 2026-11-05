-- CreateTable
CREATE TABLE "aso_apps" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "platform" "AppPlatform" NOT NULL DEFAULT 'ANDROID',
    "title" TEXT NOT NULL,
    "developer" TEXT NOT NULL,
    "developer_id" TEXT,
    "icon" TEXT NOT NULL,
    "genre" TEXT,
    "genre_id" TEXT,
    "score" DECIMAL(3,2) DEFAULT 0.0,
    "ratings" INTEGER DEFAULT 0,
    "reviews" INTEGER DEFAULT 0,
    "min_installs" BIGINT DEFAULT 0,
    "is_monitored" BOOLEAN NOT NULL DEFAULT true,
    "is_competitor" BOOLEAN NOT NULL DEFAULT false,
    "target_app_id" TEXT,
    "country" TEXT NOT NULL DEFAULT 'br',
    "lang" TEXT NOT NULL DEFAULT 'pt-BR',
    "metadata" JSONB,
    "last_scraped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aso_apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aso_keywords" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'br',
    "lang" TEXT NOT NULL DEFAULT 'pt-BR',
    "search_volume" INTEGER DEFAULT 0,
    "difficulty" INTEGER DEFAULT 0,
    "relevance" INTEGER DEFAULT 0,
    "last_tracked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aso_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aso_app_keywords" (
    "id" TEXT NOT NULL,
    "aso_app_id" TEXT NOT NULL,
    "keyword_id" TEXT NOT NULL,
    "current_rank" INTEGER,
    "previous_rank" INTEGER,
    "best_rank" INTEGER,
    "tag" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_tracked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aso_app_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aso_keyword_ranking_history" (
    "id" TEXT NOT NULL,
    "app_keyword_id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aso_keyword_ranking_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aso_audit_scores" (
    "id" TEXT NOT NULL,
    "aso_app_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "title_score" INTEGER NOT NULL,
    "short_description_score" INTEGER NOT NULL,
    "long_description_score" INTEGER NOT NULL,
    "icon_score" INTEGER NOT NULL,
    "screenshots_score" INTEGER NOT NULL,
    "ratings_score" INTEGER NOT NULL,
    "recommendations" JSONB NOT NULL,
    "audit_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aso_audit_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aso_apps_organization_id_app_id_country_lang_key" ON "aso_apps"("organization_id", "app_id", "country", "lang");
CREATE INDEX "aso_apps_organization_id_is_monitored_idx" ON "aso_apps"("organization_id", "is_monitored");
CREATE INDEX "aso_apps_app_id_country_idx" ON "aso_apps"("app_id", "country");

-- CreateIndex
CREATE UNIQUE INDEX "aso_keywords_keyword_country_lang_key" ON "aso_keywords"("keyword", "country", "lang");
CREATE INDEX "aso_keywords_keyword_idx" ON "aso_keywords"("keyword");
CREATE INDEX "aso_keywords_country_lang_idx" ON "aso_keywords"("country", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "aso_app_keywords_aso_app_id_keyword_id_key" ON "aso_app_keywords"("aso_app_id", "keyword_id");
CREATE INDEX "aso_app_keywords_aso_app_id_current_rank_idx" ON "aso_app_keywords"("aso_app_id", "current_rank");
CREATE INDEX "aso_app_keywords_keyword_id_idx" ON "aso_app_keywords"("keyword_id");

-- CreateIndex
CREATE INDEX "aso_keyword_ranking_history_app_keyword_id_recorded_at_idx" ON "aso_keyword_ranking_history"("app_keyword_id", "recorded_at");

-- CreateIndex
CREATE INDEX "aso_audit_scores_aso_app_id_audit_date_idx" ON "aso_audit_scores"("aso_app_id", "audit_date");

-- AddForeignKey
ALTER TABLE "aso_apps" ADD CONSTRAINT "aso_apps_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aso_app_keywords" ADD CONSTRAINT "aso_app_keywords_aso_app_id_fkey" FOREIGN KEY ("aso_app_id") REFERENCES "aso_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "aso_app_keywords" ADD CONSTRAINT "aso_app_keywords_keyword_id_fkey" FOREIGN KEY ("keyword_id") REFERENCES "aso_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aso_keyword_ranking_history" ADD CONSTRAINT "aso_keyword_ranking_history_app_keyword_id_fkey" FOREIGN KEY ("app_keyword_id") REFERENCES "aso_app_keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aso_audit_scores" ADD CONSTRAINT "aso_audit_scores_aso_app_id_fkey" FOREIGN KEY ("aso_app_id") REFERENCES "aso_apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
