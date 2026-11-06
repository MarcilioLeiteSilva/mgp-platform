-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "frequency_cap_per_hour" INTEGER DEFAULT 3;
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "priority_tier" INTEGER DEFAULT 2;

-- AlterTable
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "icon_url" TEXT;
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "cta_text" TEXT DEFAULT 'Instalar';
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "star_rating" DECIMAL(3,2);
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "sponsor_text" TEXT;
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "skip_offset_seconds" INTEGER DEFAULT 5;
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "reward_type" TEXT;
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "reward_amount" INTEGER;
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "required_watch_seconds" INTEGER DEFAULT 15;
ALTER TABLE "creatives" ADD COLUMN IF NOT EXISTS "html_content" TEXT;
