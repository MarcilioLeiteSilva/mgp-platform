import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CampaignStatus } from '@mgp/database';

export class UpdateCampaignStatusDto {
  @ApiProperty({ enum: CampaignStatus, description: 'Novo status da campanha' })
  @IsEnum(CampaignStatus)
  status!: CampaignStatus;

  @ApiPropertyOptional({ description: 'Motivo da alteração de status', example: 'Pausada para otimização de criativos' })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  reason?: string;
}

