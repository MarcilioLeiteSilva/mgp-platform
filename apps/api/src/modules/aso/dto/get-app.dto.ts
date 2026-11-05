import { IsOptional, IsString, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAppQueryDto {
  @ApiPropertyOptional({
    description: 'Código ISO de 2 letras do país da loja',
    default: 'us',
    example: 'br',
  })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string = 'us';

  @ApiPropertyOptional({
    description: 'Código de idioma da loja',
    default: 'en',
    example: 'pt-BR',
  })
  @IsOptional()
  @IsString()
  @Length(2, 5)
  lang?: string = 'en';
}

