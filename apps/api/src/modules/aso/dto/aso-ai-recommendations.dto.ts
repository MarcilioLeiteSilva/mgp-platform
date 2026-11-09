import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { AsoAiRecommendationType, AsoAiRecommendationStatus } from '@mgp/contracts';

export class GenerateAsoAiRecommendationsDto {
  @ApiProperty({
    description: 'Tipo de recomendação com Inteligência Artificial a ser gerada',
    enum: [
      'TITLE_OPTIMIZATION',
      'DESCRIPTION_OPTIMIZATION',
      'KEYWORD_EXPANSION',
      'CAMPAIGN_STRATEGY',
      'CREATIVE_COPY',
    ],
    example: 'TITLE_OPTIMIZATION',
  })
  @IsEnum([
    'TITLE_OPTIMIZATION',
    'DESCRIPTION_OPTIMIZATION',
    'KEYWORD_EXPANSION',
    'CAMPAIGN_STRATEGY',
    'CREATIVE_COPY',
  ])
  type!: AsoAiRecommendationType;

  @ApiPropertyOptional({
    description: 'Palavras-chave focais prioritárias para incorporar na otimização',
    example: ['finanças', 'controle de gastos', 'investimentos'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusKeywords?: string[];

  @ApiPropertyOptional({
    description: 'Tom de voz da redação gerada por IA',
    enum: ['PROFESSIONAL', 'PERSUASIVE', 'PLAYFUL', 'TECHNICAL'],
    example: 'PERSUASIVE',
  })
  @IsOptional()
  @IsString()
  tone?: 'PROFESSIONAL' | 'PERSUASIVE' | 'PLAYFUL' | 'TECHNICAL' = 'PERSUASIVE';
}

export class ListAiRecommendationsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de recomendação',
    enum: [
      'TITLE_OPTIMIZATION',
      'DESCRIPTION_OPTIMIZATION',
      'KEYWORD_EXPANSION',
      'CAMPAIGN_STRATEGY',
      'CREATIVE_COPY',
    ],
  })
  @IsOptional()
  @IsString()
  type?: AsoAiRecommendationType;

  @ApiPropertyOptional({
    description: 'Filtrar por status',
    enum: ['ACTIVE', 'APPLIED', 'DISMISSED'],
  })
  @IsOptional()
  @IsString()
  status?: AsoAiRecommendationStatus;
}

export class ApplyAiRecommendationBodyDto {
  @ApiProperty({
    description: 'Identificador único da sugestão específica a ser aplicada',
    example: 'sug-1',
  })
  @IsString()
  suggestionId!: string;
}
