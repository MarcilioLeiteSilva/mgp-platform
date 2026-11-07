import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  Min,
  IsOptional,
  MinLength,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class UpdateAdUnitDto {
  @ApiPropertyOptional({
    description: 'Novo nome identificador do bloco de anúncios',
    example: 'Banner Topo Home Atualizado',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Tag de posicionamento no layout',
    example: 'home_top_banner_v2',
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  placement?: string;

  @ApiPropertyOptional({
    description: 'Novo preço de reserva mínimo (Floor eCPM em BRL)',
    example: 2.0,
  })
  @IsNumber()
  @Min(0, { message: 'O floor eCPM não pode ser negativo.' })
  @IsOptional()
  floorEcpm?: number;

  @ApiPropertyOptional({
    description: 'Ativar ou pausar este bloco de anúncios',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

