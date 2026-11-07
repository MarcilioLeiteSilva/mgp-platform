import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResolveFraudIncidentDto {
  @ApiProperty({
    description: 'Novo status do incidente',
    enum: ['CONFIRMED', 'DISMISSED', 'RESOLVED'],
    example: 'CONFIRMED',
  })
  @IsEnum(['CONFIRMED', 'DISMISSED', 'RESOLVED'])
  status!: 'CONFIRMED' | 'DISMISSED' | 'RESOLVED';

  @ApiProperty({
    description: 'Ação tomada pela equipe ou pelo sistema',
    example: 'Estorno de créditos aplicado ao anunciante e aviso ao publisher',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  actionTaken!: string;

  @ApiPropertyOptional({
    description: 'Executar estorno financeiro automático (Fraud Chargeback) no WalletLedger',
    default: false,
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  executeChargeback: boolean = false;

  @ApiPropertyOptional({
    description: 'Observações internas e notas técnicas de resolução',
    example: 'Identificado padrão de auto-clicker com delta inferior a 150ms.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
