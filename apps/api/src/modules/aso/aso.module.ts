import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AsoCacheService } from './services/aso-cache.service';
import { AsoRateLimiterService } from './services/aso-rate-limiter.service';
import { PlayScraperEngineService } from './services/play-scraper-engine.service';
import { AsoAppsService } from './services/aso-apps.service';
import { AsoKeywordsService } from './services/aso-keywords.service';
import { AsoAuditService } from './services/aso-audit.service';
import { AsoQueueService } from './services/aso-queue.service';
import { PlayScraperController } from './controllers/play-scraper.controller';
import { AsoController } from './controllers/aso.controller';

@Module({
  imports: [AuthModule],
  controllers: [PlayScraperController, AsoController],
  providers: [
    AsoCacheService,
    AsoRateLimiterService,
    PlayScraperEngineService,
    AsoAppsService,
    AsoKeywordsService,
    AsoAuditService,
    AsoQueueService,
  ],
  exports: [
    AsoCacheService,
    AsoRateLimiterService,
    PlayScraperEngineService,
    AsoAppsService,
    AsoKeywordsService,
    AsoAuditService,
    AsoQueueService,
  ],
})
export class AsoModule {}
