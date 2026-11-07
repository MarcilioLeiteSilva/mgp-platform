import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@mgp/database';

export class CreateDepositDto {
  @ApiProperty({
    description: 'Valor a ser creditado na conta de anunciante (em BRL)',
    example: 100.0,
    minimum: 10,
  })
  @IsNumber()
  @Min(10.0, { message: 'O valor mínimo para recarga é de R$ 10,00.' })
  @Max(100000.0, { message: 'O valor máximo para recarga é de R$ 100.000,00.' })
  amount!: number;

  @ApiPropertyOptional({
    enum: PaymentMethod,
    default: PaymentMethod.PIX,
    description: 'Método de pagamento (PIX, CREDIT_CARD, BOLETO)',
  })
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.PIX;

  @ApiPropertyOptional({
    description: 'Moeda da transação',
    default: 'BRL',
    example: 'BRL',
  })
  @IsString()
  @IsOptional()
  currency?: string = 'BRL';
}

