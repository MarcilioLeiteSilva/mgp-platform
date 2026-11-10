import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PlanTier, BillingCycle } from '@mgp/contracts';

export class SubscribePlanDto {
  @ApiProperty({
    description: 'Nível do plano contratado',
    enum: ['FREE', 'STARTER', 'PRO', 'BUSINESS'],
    example: 'PRO',
  })
  @IsEnum(['FREE', 'STARTER', 'PRO', 'BUSINESS'])
  planTier!: PlanTier;

  @ApiPropertyOptional({
    description: 'Ciclo de faturamento (MONTHLY ou YEARLY)',
    enum: ['MONTHLY', 'YEARLY'],
    default: 'MONTHLY',
    example: 'MONTHLY',
  })
  @IsOptional()
  @IsEnum(['MONTHLY', 'YEARLY'])
  billingCycle?: BillingCycle = 'MONTHLY';
}

