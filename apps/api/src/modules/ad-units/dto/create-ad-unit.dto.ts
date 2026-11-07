import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { AdFormat } from '@mgp/database';

export class CreateAdUnitDto {
  @ApiProperty({
    description: 'UUID do aplicativo proprietário deste bloco de anúncios',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'appId deve ser um UUID válido.' })
  appId!: string;

  @ApiProperty({
    description: 'Nome identificador do bloco de anúncios',
    example: 'Banner Superior Tela Inicial',
  })
  @IsString()
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres.' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres.' })
  name!: string;

  @ApiProperty({
    enum: AdFormat,
    description: 'Formato do bloco (BANNER, NATIVE, INTERSTITIAL, REWARDED)',
    example: AdFormat.BANNER,
  })
  @IsEnum(AdFormat, { message: 'Formato inválido. Valores aceitos: BANNER, NATIVE, INTERSTITIAL, REWARDED.' })
  format!: AdFormat;

  @ApiPropertyOptional({
    description: 'Tag de localização ou contexto no aplicativo',
    example: 'home_top_banner',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  placement?: string;

  @ApiPropertyOptional({
    description: 'Preço de reserva mínimo (Floor eCPM em BRL) para vencer o leilão RTB',
    example: 1.5,
    default: 0.0,
  })
  @IsNumber()
  @Min(0, { message: 'O floor eCPM não pode ser negativo.' })
  @IsOptional()
  floorEcpm?: number = 0.0;

  @ApiPropertyOptional({
    description: 'Indica se a Ad Unit está ativa para receber requisições de anúncios',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}

