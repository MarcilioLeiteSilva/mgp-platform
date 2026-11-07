import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { WalletAccountType, LedgerTransactionType } from '@mgp/database';

export class ListTransactionsQueryDto {
  @ApiPropertyOptional({
    enum: WalletAccountType,
    description: 'Filtrar por conta contábil (ADVERTISING_CREDITS, EXCHANGE_CREDITS, PUBLISHER_EARNINGS)',
  })
  @IsEnum(WalletAccountType)
  @IsOptional()
  accountType?: WalletAccountType;

  @ApiPropertyOptional({
    enum: LedgerTransactionType,
    description: 'Filtrar por tipo de transação no livro-razão',
  })
  @IsEnum(LedgerTransactionType)
  @IsOptional()
  transactionType?: LedgerTransactionType;

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

