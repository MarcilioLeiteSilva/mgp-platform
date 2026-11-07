import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PayoutStatus } from '@mgp/database';

export class ListPayoutsQueryDto {
  @ApiPropertyOptional({ enum: PayoutStatus, description: 'Filtrar por status do saque' })
  @IsEnum(PayoutStatus)
  @IsOptional()
  status?: PayoutStatus;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}

