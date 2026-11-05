import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetDeveloperAppsQueryDto {
  @ApiPropertyOptional({
    description: 'Código ISO de 2 letras do país',
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

  @ApiPropertyOptional({
    description: 'Quantidade máxima de aplicativos do desenvolvedor',
    default: 50,
    minimum: 1,
    maximum: 100,
    example: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  num?: number = 50;
}

