import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AsoCacheService } from './services/aso-cache.service';
import { AsoRateLimiterService } from './services/aso-rate-limiter.service';
import { PlayScraperEngineService } from './services/play-scraper-engine.service';
import { PlayScraperController } from './controllers/play-scraper.controller';

@Module({
  imports: [AuthModule],
  controllers: [PlayScraperController],
  providers: [
    AsoCacheService,
    AsoRateLimiterService,
    PlayScraperEngineService,
  ],
  exports: [
    AsoCacheService,
    AsoRateLimiterService,
    PlayScraperEngineService,
  ],
})
export class AsoModule {}

