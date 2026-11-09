import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RecalculateAsoEstimateDto {
  @ApiPropertyOptional({
    description: 'Código de duas letras do país (ISO 3166-1 alpha-2, ex: BR, US)',
    example: 'BR',
    default: 'BR',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Forçar posição de rank na categoria como base de cálculo (1 a 1000)',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  forceRankBasis?: number;
}

export class AsoEstimateQueryDto {
  @ApiPropertyOptional({
    description: 'Número de dias históricos para retornar (máximo 90)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(90)
  days?: number = 30;

  @ApiPropertyOptional({
    description: 'País de análise de mercado',
    example: 'BR',
    default: 'BR',
  })
  @IsOptional()
  @IsString()
  country?: string = 'BR';
}

