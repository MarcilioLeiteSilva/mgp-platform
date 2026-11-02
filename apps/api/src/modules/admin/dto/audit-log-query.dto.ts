import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class AuditLogQueryDto {
  @ApiPropertyOptional({ description: 'Página atual para paginação', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Limite de registros por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filtro por ID de Organização' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Filtro por ID de Usuário' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filtro por Ação (ex: USER_LOGIN, APP_CREATED)' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filtro por Tipo de Entidade (ex: User, Organization, App)' })
  @IsOptional()
  @IsString()
  entityType?: string;
}
