import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class SimulateBidDto {
  @ApiPropertyOptional({
    description: 'Métrica alvo para otimização',
    enum: ['IMPRESSIONS', 'CLICKS', 'CONVERSIONS'],
    default: 'IMPRESSIONS',
  })
  @IsOptional()
  @IsEnum(['IMPRESSIONS', 'CLICKS', 'CONVERSIONS'])
  targetMetric?: 'IMPRESSIONS' | 'CLICKS' | 'CONVERSIONS' = 'IMPRESSIONS';

  @ApiPropertyOptional({
    description: 'Orçamento considerado na simulação',
    example: 100.0,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  budget?: number;

  @ApiPropertyOptional({
    description: 'Lance base para comparação',
    example: 2.5,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  currentBid?: number;

  @ApiPropertyOptional({
    description: 'Categoria do aplicativo alvo',
    example: 'GAME_CASUAL',
  })
  @IsOptional()
  @IsString()
  category?: string;
}

