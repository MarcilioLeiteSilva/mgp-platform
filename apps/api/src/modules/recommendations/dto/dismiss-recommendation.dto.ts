import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DismissRecommendationDto {
  @ApiPropertyOptional({
    description: 'Motivo do descarte da recomendação',
    example: 'Orçamento já alocado para outra estratégia',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}

