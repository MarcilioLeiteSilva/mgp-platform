import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SimulateIvtInspectionDto {
  @ApiPropertyOptional({ description: 'ID do aplicativo avaliado' })
  @IsOptional()
  @IsUUID()
  appId?: string;

  @ApiPropertyOptional({ description: 'ID da campanha publicitária associada' })
  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @ApiPropertyOptional({
    description: 'Intervalo em milissegundos entre impressão e clique (Click Delta)',
    example: 120,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  clickDeltaMs?: number;

  @ApiPropertyOptional({
    description: 'Taxa de cliques por minuto observada no mesmo IP ou dispositivo',
    example: 22,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  clicksPerMinute?: number;

  @ApiPropertyOptional({ description: 'Flag indicando se o dispositivo roda em emulador' })
  @IsOptional()
  @IsBoolean()
  isEmulator?: boolean;

  @ApiPropertyOptional({ description: 'Flag indicando se o dispositivo possui acesso root' })
  @IsOptional()
  @IsBoolean()
  isRooted?: boolean;

  @ApiPropertyOptional({ description: 'IP de origem da requisição', example: '185.220.101.5' })
  @IsOptional()
  @IsString()
  sourceIp?: string;

  @ApiPropertyOptional({ description: 'User-Agent do cliente' })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiPropertyOptional({
    description: 'Indica se a requisição de clique possui token de impressão válido',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  hasViewToken: boolean = true;
}

