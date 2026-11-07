import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppsModule } from './modules/apps/apps.module';
import { AsoModule } from './modules/aso/aso.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { AdUnitsModule } from './modules/ad-units/ad-units.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AdminModule,
    AppsModule,
    AsoModule,
    TelemetryModule,
    CampaignsModule,
    AdUnitsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
