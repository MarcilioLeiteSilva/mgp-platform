import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'Nome amigável ou identificador da aplicação consumidora',
    example: 'Dashboard de BI da Agência',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Escopos de permissão concedidos para a chave de API',
    example: ['aso:read', 'estimates:read', 'trends:read'],
    default: ['aso:read', 'estimates:read', 'trends:read'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({
    description: 'Validade da chave em dias (deixe nulo para chave permanente sem expiração)',
    example: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;
}

export class PublicAsoAppQueryDto {
  @ApiPropertyOptional({
    description: 'Código do país para localização de metadados na Play Store',
    default: 'BR',
    example: 'BR',
  })
  @IsOptional()
  @IsString()
  country?: string = 'BR';
}

export class PublicAsoEstimatesQueryDto {
  @ApiPropertyOptional({
    description: 'Janela de dias para histórico de estimativas (máx 90 dias)',
    default: 30,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  days?: number = 30;

  @ApiPropertyOptional({
    description: 'País de referência da estimativa',
    default: 'BR',
  })
  @IsOptional()
  @IsString()
  country?: string = 'BR';
}

export class PublicTrendsQueryDto {
  @ApiPropertyOptional({
    description: 'Código do país da categoria analisada',
    default: 'BR',
  })
  @IsOptional()
  @IsString()
  country?: string = 'BR';

  @ApiPropertyOptional({
    description: 'Quantidade máxima de breakouts retornados (máx 50)',
    default: 15,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 15;
}

export class PublicKeywordRankingQueryDto {
  @ApiProperty({
    description: 'Termo de busca / palavra-chave a consultar',
    example: 'investimentos',
  })
  @IsString()
  @IsNotEmpty()
  keyword!: string;

  @ApiProperty({
    description: 'Identificador do aplicativo (package name) a checar posição',
    example: 'com.nu.production',
  })
  @IsString()
  @IsNotEmpty()
  appId!: string;

  @ApiPropertyOptional({
    description: 'País da busca',
    default: 'BR',
  })
  @IsOptional()
  @IsString()
  country?: string = 'BR';
}
