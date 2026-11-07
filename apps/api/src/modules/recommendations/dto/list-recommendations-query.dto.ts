import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { RecommendationPriority, RecommendationStatus } from '@mgp/shared';

export class ListRecommendationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por ID da campanha',
  })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por status da recomendação',
    enum: RecommendationStatus,
  })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por prioridade',
    enum: RecommendationPriority,
  })
  @IsOptional()
  @IsEnum(RecommendationPriority)
  priority?: RecommendationPriority;

  @ApiPropertyOptional({
    description: 'Página da listagem',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Itens por página',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
