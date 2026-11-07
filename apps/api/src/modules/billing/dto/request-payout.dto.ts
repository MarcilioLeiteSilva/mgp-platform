import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsEnum, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { PayoutMethod } from '@mgp/database';

export class RequestPayoutDto {
  @ApiProperty({
    description: 'Valor a ser sacado da conta de publisher (em BRL)',
    example: 150.0,
    minimum: 50,
  })
  @IsNumber()
  @Min(50.0, { message: 'O valor mínimo para saque de publisher é de R$ 50,00.' })
  @Max(50000.0, { message: 'O valor máximo por solicitação de saque é de R$ 50.000,00.' })
  amount!: number;

  @ApiPropertyOptional({
    enum: PayoutMethod,
    default: PayoutMethod.PIX,
    description: 'Método de repasse (PIX, BANK_TRANSFER, STRIPE_CONNECT)',
  })
  @IsEnum(PayoutMethod)
  @IsOptional()
  payoutMethod?: PayoutMethod = PayoutMethod.PIX;

  @ApiProperty({
    description: 'Chave de destino do repasse (ex: Chave PIX CPF/CNPJ/Email/EVP)',
    example: '12345678909',
  })
  @IsString()
  @MinLength(3, { message: 'A chave de destino deve ter no mínimo 3 caracteres.' })
  @MaxLength(100, { message: 'A chave de destino deve ter no máximo 100 caracteres.' })
  recipientKey!: string;

  @ApiPropertyOptional({
    description: 'Dados bancários complementares ou metadados da conta',
  })
  @IsOptional()
  recipientData?: Record<string, any>;
}

