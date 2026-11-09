import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AsoModule } from '../aso/aso.module';
import { ApiKeysService } from './services/api-keys.service';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { ApiKeysController } from './controllers/api-keys.controller';
import { PublicAsoController } from './controllers/public-aso.controller';

@Module({
  imports: [AuthModule, AsoModule],
  controllers: [ApiKeysController, PublicAsoController],
  providers: [ApiKeysService, ApiKeyAuthGuard],
  exports: [ApiKeysService, ApiKeyAuthGuard],
})
export class ApiKeysModule {}
