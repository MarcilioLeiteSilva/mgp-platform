import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsPositive,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';
import { CampaignType, CampaignBillingModel } from '@mgp/database';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Nome descritivo da campanha', example: 'Aquisição Q4 - Black Friday' })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ enum: CampaignType, default: CampaignType.PAID })
  @IsEnum(CampaignType)
  @IsOptional()
  type?: CampaignType = CampaignType.PAID;

  @ApiPropertyOptional({ enum: CampaignBillingModel, default: CampaignBillingModel.CPM })
  @IsEnum(CampaignBillingModel)
  @IsOptional()
  billingModel?: CampaignBillingModel = CampaignBillingModel.CPM;

  @ApiProperty({ description: 'Valor do lance monetário (Bid Amount)', example: 5.50 })
  @IsNumber()
  @IsPositive()
  bidAmount!: number;

  @ApiProperty({ description: 'Orçamento diário limite em BRL', example: 100.00 })
  @IsNumber()
  @IsPositive()
  dailyBudget!: number;

  @ApiProperty({ description: 'Orçamento total contratado em BRL', example: 2500.00 })
  @IsNumber()
  @IsPositive()
  totalBudget!: number;

  @ApiPropertyOptional({ description: 'Limite de impressões por usuário/hora (Frequency Capping)', default: 3 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  frequencyCapPerHour?: number = 3;

  @ApiPropertyOptional({ description: 'Tier de prioridade no leilão (1: House/Direct, 2: Paid, 3: Exchange)', default: 2 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  priorityTier?: number = 2;

  @ApiPropertyOptional({ description: 'Código do país alvo ISO-3166-1 alpha-2', default: 'BR', example: 'BR' })
  @IsString()
  @MinLength(2)
  @MaxLength(2)
  @IsOptional()
  targetCountry?: string = 'BR';

  @ApiPropertyOptional({ description: 'Categorias de aplicativos alvo (ou ALL)', default: 'ALL', example: 'GAME,FINANCE' })
  @IsString()
  @IsOptional()
  targetCategories?: string = 'ALL';

  @ApiPropertyOptional({ description: 'Data de início da campanha (ISO-8601)', example: '2026-11-10T00:00:00Z' })
  @IsISO8601()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data de término da campanha (ISO-8601)', example: '2026-12-31T23:59:59Z' })
  @IsISO8601()
  @IsOptional()
  endDate?: string;
}

