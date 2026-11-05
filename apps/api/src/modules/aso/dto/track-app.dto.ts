import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppPlatform } from '@mgp/database';

export class TrackAppDto {
  @ApiProperty({
    description: 'Package name oficial do aplicativo no Google Play (ex: com.whatsapp)',
    example: 'com.whatsapp',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)+$/, {
    message: 'O appId deve ser um package name válido (ex: com.exemplo.app).',
  })
  appId!: string;

  @ApiPropertyOptional({
    description: 'Plataforma do aplicativo',
    enum: AppPlatform,
    default: AppPlatform.ANDROID,
    example: AppPlatform.ANDROID,
  })
  @IsOptional()
  @IsEnum(AppPlatform)
  platform?: AppPlatform = AppPlatform.ANDROID;

  @ApiPropertyOptional({
    description: 'Indica se este aplicativo é um concorrente mapeado para benchmark',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isCompetitor?: boolean = false;

  @ApiPropertyOptional({
    description: 'Package name do aplicativo principal de referência, caso este seja concorrente',
    example: 'com.meuapp.principal',
  })
  @IsOptional()
  @IsString()
  targetAppId?: string;

  @ApiPropertyOptional({
    description: 'Código de país da loja (ISO de 2 letras)',
    default: 'br',
    example: 'br',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string = 'br';

  @ApiPropertyOptional({
    description: 'Código do idioma dos metadados da loja',
    default: 'pt-BR',
    example: 'pt-BR',
  })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  lang?: string = 'pt-BR';
}

