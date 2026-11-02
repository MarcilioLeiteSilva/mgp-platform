import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, Matches, IsOptional } from 'class-validator';
import { AppPlatform } from '@mgp/database';

export class CreateAppDto {
  @ApiProperty({
    example: 'Meu Jogo Casual 3D',
    description: 'Nome de exibição do aplicativo',
  })
  @IsString({ message: 'O nome do aplicativo deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do aplicativo é obrigatório.' })
  name!: string;

  @ApiProperty({
    example: 'com.meuestudio.meujogo',
    description: 'Package name no Google Play ou Bundle ID na Apple App Store',
  })
  @IsString()
  @IsNotEmpty({ message: 'O package_name é obrigatório.' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/, {
    message: 'O package_name deve seguir o padrão reverse domain (ex: com.empresa.app).',
  })
  packageName!: string;

  @ApiPropertyOptional({
    enum: AppPlatform,
    default: AppPlatform.ANDROID,
    example: AppPlatform.ANDROID,
    description: 'Plataforma do aplicativo (ANDROID ou IOS)',
  })
  @IsOptional()
  @IsEnum(AppPlatform, { message: 'Plataforma inválida. Valores aceitos: ANDROID, IOS.' })
  platform?: AppPlatform;
}
