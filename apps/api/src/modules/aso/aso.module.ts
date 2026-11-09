import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AsoCacheService } from './services/aso-cache.service';
import { AsoRateLimiterService } from './services/aso-rate-limiter.service';
import { PlayScraperEngineService } from './services/play-scraper-engine.service';
import { AsoAppsService } from './services/aso-apps.service';
import { AsoKeywordsService } from './services/aso-keywords.service';
import { AsoAuditService } from './services/aso-audit.service';
import { AsoQueueService } from './services/aso-queue.service';
import { AsoEstimatesService } from './services/aso-estimates.service';
import { AsoTrendsService } from './services/aso-trends.service';
import { AsoAiRecommendationsService } from './services/aso-ai-recommendations.service';
import { PlayScraperController } from './controllers/play-scraper.controller';
import { AsoController } from './controllers/aso.controller';
import { AsoEstimatesController } from './controllers/aso-estimates.controller';
import { AsoTrendsController } from './controllers/aso-trends.controller';
import { AsoAiRecommendationsController } from './controllers/aso-ai-recommendations.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    PlayScraperController,
    AsoController,
    AsoEstimatesController,
    AsoTrendsController,
    AsoAiRecommendationsController,
  ],
  providers: [
    AsoCacheService,
    AsoRateLimiterService,
    PlayScraperEngineService,
    AsoAppsService,
    AsoKeywordsService,
    AsoAuditService,
    AsoQueueService,
    AsoEstimatesService,
    AsoTrendsService,
    AsoAiRecommendationsService,
  ],
  exports: [
    AsoCacheService,
    AsoRateLimiterService,
    PlayScraperEngineService,
    AsoAppsService,
    AsoKeywordsService,
    AsoAuditService,
    AsoQueueService,
    AsoEstimatesService,
    AsoTrendsService,
    AsoAiRecommendationsService,
  ],
})
export class AsoModule {}
