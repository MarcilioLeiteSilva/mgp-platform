import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListAsoAppsQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar exclusivamente por aplicativos principais (false) ou concorrentes (true)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isCompetitor?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por status de monitoramento ativo',
    default: true,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isMonitored?: boolean = true;

  @ApiPropertyOptional({
    description: 'Termo de busca textual para filtrar por título ou package name',
    example: 'whatsapp',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Número da página para paginação',
    default: 1,
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página',
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
  limit?: number = 20;
}

