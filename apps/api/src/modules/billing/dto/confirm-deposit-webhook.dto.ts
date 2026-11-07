import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive, IsOptional, IsISO8601 } from 'class-validator';

export class ConfirmDepositWebhookDto {
  @ApiProperty({ description: 'Referência única gerada para a fatura/cobrança no gateway' })
  @IsString()
  gatewayReference!: string;

  @ApiProperty({ description: 'Valor efetivamente pago confirmado pelo gateway' })
  @IsNumber()
  @IsPositive()
  paidAmount!: number;

  @ApiPropertyOptional({ description: 'Data/hora de liquidação (ISO 8601)' })
  @IsISO8601()
  @IsOptional()
  paidAt?: string;

  @ApiPropertyOptional({ description: 'Assinatura digital HMAC do gateway para validação de autenticidade' })
  @IsString()
  @IsOptional()
  signature?: string;
}

