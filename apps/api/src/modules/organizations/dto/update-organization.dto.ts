import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    example: 'Minha Empresa Mobile Atualizada',
    description: 'Novo nome fantasia ou razão social da organização',
  })
  @IsOptional()
  @IsString({ message: 'O nome da organização deve ser um texto.' })
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  @MaxLength(100, { message: 'O nome não pode exceder 100 caracteres.' })
  name?: string;

  @ApiPropertyOptional({
    example: '12.345.678/0001-90',
    description: 'Novo CNPJ ou CPF do titular da organização',
  })
  @IsOptional()
  @IsString()
  documentCnpjCpf?: string;

  @ApiPropertyOptional({
    example: 'PRO',
    description: 'Nível de plano da organização',
  })
  @IsOptional()
  @IsString()
  planTier?: string;
}

