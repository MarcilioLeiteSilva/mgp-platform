import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlayCollection } from '../types/google-play.types';

export class TopChartsDto {
  @ApiPropertyOptional({
    description: 'Categoria do Google Play (ex: APPLICATION, GAME, FINANCE, PRODUCTIVITY)',
    default: 'APPLICATION',
    example: 'FINANCE',
  })
  @IsOptional()
  @IsString()
  category?: string = 'APPLICATION';

  @ApiPropertyOptional({
    description: 'Coleção do ranking: TOP_FREE, TOP_PAID ou GROSSING',
    enum: PlayCollection,
    default: PlayCollection.TOP_FREE,
    example: PlayCollection.TOP_FREE,
  })
  @IsOptional()
  @IsEnum(PlayCollection)
  collection?: PlayCollection = PlayCollection.TOP_FREE;

  @ApiPropertyOptional({
    description: 'Código ISO de 2 letras do país do ranking',
    default: 'us',
    example: 'br',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string = 'us';

  @ApiPropertyOptional({
    description: 'Código de idioma dos metadados',
    default: 'en',
    example: 'pt-BR',
  })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  lang?: string = 'en';

  @ApiPropertyOptional({
    description: 'Quantidade de aplicativos no ranking',
    default: 50,
    minimum: 1,
    maximum: 100,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  num?: number = 50;
}

