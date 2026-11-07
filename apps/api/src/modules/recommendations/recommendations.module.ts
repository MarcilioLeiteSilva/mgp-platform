import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { SmartBiddingService } from './smart-bidding.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, SmartBiddingService],
  exports: [RecommendationsService, SmartBiddingService],
})
export class RecommendationsModule {}
