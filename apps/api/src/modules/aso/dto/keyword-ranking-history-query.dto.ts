import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class KeywordRankingHistoryQueryDto {
  @ApiPropertyOptional({
    description: 'Janela temporal em dias para histórico de ranking',
    default: 30,
    minimum: 1,
    maximum: 180,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(180)
  days?: number = 30;
}

