import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AntifraudController } from './antifraud.controller';
import { AntifraudService } from './antifraud.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AntifraudController],
  providers: [AntifraudService],
  exports: [AntifraudService],
})
export class AntifraudModule {}

