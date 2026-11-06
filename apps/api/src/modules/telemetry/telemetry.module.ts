import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AppConfigModule } from '../../config/app-config.module';
import { AuthModule } from '../auth/auth.module';
import { TelemetryController } from './controllers/telemetry.controller';
import { TelemetryAntifraudService } from './services/telemetry-antifraud.service';
import { TelemetryQueueService } from './services/telemetry-queue.service';
import { TelemetryIngestionService } from './services/telemetry-ingestion.service';

@Module({
  imports: [DatabaseModule, AppConfigModule, AuthModule],
  controllers: [TelemetryController],
  providers: [
    TelemetryAntifraudService,
    TelemetryQueueService,
    TelemetryIngestionService,
  ],
  exports: [
    TelemetryAntifraudService,
    TelemetryQueueService,
    TelemetryIngestionService,
  ],
})
export class TelemetryModule {}

