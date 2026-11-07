import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { AdFormat } from '@mgp/database';

export class ListAdUnitsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por aplicativo específico (UUID)' })
  @IsUUID('4')
  @IsOptional()
  appId?: string;

  @ApiPropertyOptional({ enum: AdFormat, description: 'Filtrar por formato do anúncio' })
  @IsEnum(AdFormat)
  @IsOptional()
  format?: AdFormat;

  @ApiPropertyOptional({ description: 'Filtrar por status ativo/inativo' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Busca textual por nome da Ad Unit' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

