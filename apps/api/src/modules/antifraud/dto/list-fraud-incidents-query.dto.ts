import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { FraudIncidentStatus, FraudSeverity, IvtCategory } from '@mgp/shared';

export class ListFraudIncidentsQueryDto {
  @ApiPropertyOptional({ description: 'Filtrar por aplicativo' })
  @IsOptional()
  @IsUUID()
  appId?: string;

  @ApiPropertyOptional({ description: 'Filtrar por campanha' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({ description: 'Categoria de IVT', enum: IvtCategory })
  @IsOptional()
  @IsEnum(IvtCategory)
  category?: IvtCategory;

  @ApiPropertyOptional({ description: 'Nível de severidade', enum: FraudSeverity })
  @IsOptional()
  @IsEnum(FraudSeverity)
  severity?: FraudSeverity;

  @ApiPropertyOptional({ description: 'Status do incidente', enum: FraudIncidentStatus })
  @IsOptional()
  @IsEnum(FraudIncidentStatus)
  status?: FraudIncidentStatus;

  @ApiPropertyOptional({ description: 'Página da listagem', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Itens por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

