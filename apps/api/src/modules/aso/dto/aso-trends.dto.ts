import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CategoryTrendsQueryDto {
  @ApiPropertyOptional({
    description: 'Código do país para análise de mercado (ISO 3166-1 alpha-2, ex: BR, US)',
    example: 'BR',
    default: 'BR',
  })
  @IsOptional()
  @IsString()
  country?: string = 'BR';
}

export class BreakoutsQueryDto {
  @ApiPropertyOptional({
    description: 'Categoria do Google Play para filtrar (ex: GAME, FINANCE, SHOPPING, TOOLS)',
    example: 'GAME',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'País de análise de mercado',
    example: 'BR',
    default: 'BR',
  })
  @IsOptional()
  @IsString()
  country?: string = 'BR';

  @ApiPropertyOptional({
    description: 'Pontuação mínima de breakout (0 a 100)',
    example: 60,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minBreakoutScore?: number = 50;

  @ApiPropertyOptional({
    description: 'Limite de aplicativos retornados',
    example: 20,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class TrendingKeywordsQueryDto {
  @ApiPropertyOptional({
    description: 'Categoria setorial relacionada',
    example: 'FINANCE',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'País de consulta',
    example: 'BR',
    default: 'BR',
  })
  @IsOptional()
  @IsString()
  country?: string = 'BR';
}

export class TrendAlertsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar apenas alertas não lidos',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unreadOnly?: boolean = false;
}

