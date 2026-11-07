import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { BiddingStrategy, PacingMode } from '@mgp/shared';

export class UpdateBiddingStrategyDto {
  @ApiPropertyOptional({
    description: 'Estratégia de lances para o leilão RTB',
    enum: BiddingStrategy,
    example: BiddingStrategy.SMART_PACING,
  })
  @IsOptional()
  @IsEnum(BiddingStrategy)
  biddingStrategy?: BiddingStrategy;

  @ApiPropertyOptional({
    description: 'Modo de distribuição do orçamento diário (Pacing)',
    enum: PacingMode,
    example: PacingMode.EVEN,
  })
  @IsOptional()
  @IsEnum(PacingMode)
  pacingMode?: PacingMode;

  @ApiPropertyOptional({
    description: 'Meta de CPA em reais (para estratégia TARGET_CPA)',
    example: 4.5,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetCpa?: number;

  @ApiPropertyOptional({
    description: 'Ativa otimização contínua automática',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoOptimize?: boolean;
}
