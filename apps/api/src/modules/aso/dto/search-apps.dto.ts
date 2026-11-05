import { IsNotEmpty, IsOptional, IsString, IsInt, Min, Max, Length, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchAppsDto {
  @ApiProperty({
    description: 'Termo ou palavra-chave para buscar na Google Play Store',
    example: 'finanças pessoais',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  term!: string;

  @ApiPropertyOptional({
    description: 'Código ISO de 2 letras do país de busca',
    default: 'us',
    example: 'br',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string = 'us';

  @ApiPropertyOptional({
    description: 'Código de idioma da pesquisa',
    default: 'en',
    example: 'pt-BR',
  })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  lang?: string = 'en';

  @ApiPropertyOptional({
    description: 'Quantidade máxima de resultados a retornar',
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  num?: number = 20;
}

