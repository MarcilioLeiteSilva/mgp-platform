import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsUrl,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsPositive,
  IsBoolean,
} from 'class-validator';
import { AdFormat } from '@mgp/database';

export class CreateCreativeDto {
  @ApiProperty({ enum: AdFormat, description: 'Formato do anúncio (BANNER, NATIVE, INTERSTITIAL, REWARDED)' })
  @IsEnum(AdFormat)
  format!: AdFormat;

  @ApiProperty({ description: 'Título de exibição do criativo', example: 'Baixe Agora e Ganhe 50 Moedas!' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  title!: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada do anúncio', example: 'O RPG mais premiado do ano com batalhas épicas.' })
  @IsString()
  @MaxLength(300)
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'URL da imagem ou vídeo principal', example: 'https://cdn.mgp.io/creatives/banner-320x50.png' })
  @IsUrl()
  imageUrl!: string;

  @ApiProperty({ description: 'URL de destino ao clicar no anúncio', example: 'https://play.google.com/store/apps/details?id=com.game.app' })
  @IsUrl()
  actionUrl!: string;

  @ApiPropertyOptional({ description: 'Largura em pixels (para Banners)', default: 320 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  width?: number = 320;

  @ApiPropertyOptional({ description: 'Altura em pixels (para Banners)', default: 50 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  height?: number = 50;

  @ApiPropertyOptional({ description: 'URL do ícone (para Native Ads)', example: 'https://cdn.mgp.io/creatives/icon.png' })
  @IsUrl()
  @IsOptional()
  iconUrl?: string;

  @ApiPropertyOptional({ description: 'Texto do botão de chamada para ação', default: 'Instalar', example: 'Jogar Grátis' })
  @IsString()
  @MaxLength(30)
  @IsOptional()
  ctaText?: string = 'Instalar';

  @ApiPropertyOptional({ description: 'Avaliação em estrelas (para Native Ads)', example: 4.8 })
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  starRating?: number;

  @ApiPropertyOptional({ description: 'Texto de patrocinador (para Native Ads)', example: 'Patrocinado por Epic Studios' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  sponsorText?: string;

  @ApiPropertyOptional({ description: 'Segundos para liberação do botão pular (para Interstitials)', default: 5 })
  @IsInt()
  @Min(0)
  @Max(30)
  @IsOptional()
  skipOffsetSeconds?: number = 5;

  @ApiPropertyOptional({ description: 'Tipo de recompensa (para Rewarded Ads)', example: 'GEMS' })
  @IsString()
  @MaxLength(50)
  @IsOptional()
  rewardType?: string;

  @ApiPropertyOptional({ description: 'Quantidade da recompensa concedida', example: 100 })
  @IsInt()
  @IsPositive()
  @IsOptional()
  rewardAmount?: number;

  @ApiPropertyOptional({ description: 'Duração obrigatória assistida em segundos (para Rewarded Ads)', default: 15 })
  @IsInt()
  @Min(5)
  @Max(60)
  @IsOptional()
  requiredWatchSeconds?: number = 15;

  @ApiPropertyOptional({ description: 'Conteúdo HTML/MRAID customizado' })
  @IsString()
  @IsOptional()
  htmlContent?: string;

  @ApiPropertyOptional({ description: 'Indica se o criativo está ativo para veiculação', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

