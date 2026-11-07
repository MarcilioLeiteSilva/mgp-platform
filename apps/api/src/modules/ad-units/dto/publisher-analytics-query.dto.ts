import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsIn, IsISO8601 } from 'class-validator';

export class PublisherAnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar métricas por aplicativo (UUID)' })
  @IsUUID('4')
  @IsOptional()
  appId?: string;

  @ApiPropertyOptional({ description: 'Filtrar métricas por bloco de anúncios específico (UUID)' })
  @IsUUID('4')
  @IsOptional()
  adUnitId?: string;

  @ApiPropertyOptional({
    description: 'Janela de agregação rápida (today, 7d, 30d, all)',
    default: '30d',
    example: '30d',
  })
  @IsIn(['today', '7d', '30d', 'all'])
  @IsOptional()
  period?: 'today' | '7d' | '30d' | 'all' = '30d';

  @ApiPropertyOptional({ description: 'Data de início (ISO 8601)', example: '2026-11-01T00:00:00Z' })
  @IsISO8601()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data de término (ISO 8601)', example: '2026-11-07T23:59:59Z' })
  @IsISO8601()
  @IsOptional()
  endDate?: string;
}

