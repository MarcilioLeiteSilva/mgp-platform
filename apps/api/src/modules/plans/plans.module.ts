import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PlansService } from './services/plans.service';
import { PlansController } from './controllers/plans.controller';

@Module({
  imports: [AuthModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}

