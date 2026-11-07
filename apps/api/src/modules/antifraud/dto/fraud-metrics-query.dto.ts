import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class FraudMetricsQueryDto {
  @ApiPropertyOptional({
    description: 'Janela temporal das métricas de fraude',
    enum: ['24h', '7d', '30d'],
    default: '7d',
  })
  @IsOptional()
  @IsEnum(['24h', '7d', '30d'])
  period: '24h' | '7d' | '30d' = '7d';

  @ApiPropertyOptional({ description: 'Filtrar métricas por aplicativo específico' })
  @IsOptional()
  @IsUUID()
  appId?: string;
}
