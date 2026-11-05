import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TrackKeywordDto {
  @ApiProperty({
    description: 'Palavra-chave ou termo de pesquisa para rastreamento de posicionamento',
    example: 'mensageiro seguro',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  keyword!: string;

  @ApiPropertyOptional({
    description: 'Etiqueta ou categoria para organização da palavra-chave (ex: core, brand, competitor)',
    default: 'core',
    example: 'core',
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  tag?: string = 'core';
}

