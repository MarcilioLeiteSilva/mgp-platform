import { IsNotEmpty, IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuggestKeywordsDto {
  @ApiProperty({
    description: 'Prefixo ou termo para obter sugestões do autocomplete do Google Play',
    example: 'whatsa',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  term!: string;

  @ApiPropertyOptional({
    description: 'Código ISO de 2 letras do país',
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
}

