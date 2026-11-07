import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class ApplyRecommendationDto {
  @ApiPropertyOptional({
    description: 'Parâmetros customizados opcionais para sobrepor os sugeridos',
    example: { bidAmount: 3.2 },
  })
  @IsOptional()
  @IsObject()
  overrideParams?: Record<string, any>;
}

