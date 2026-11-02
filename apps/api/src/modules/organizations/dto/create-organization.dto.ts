import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Minha Empresa Mobile',
    description: 'Nome fantasia ou razão social da organização',
  })
  @IsString({ message: 'O nome da organização deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da organização é obrigatório.' })
  @MinLength(2, { message: 'O nome deve ter no mínimo 2 caracteres.' })
  @MaxLength(100, { message: 'O nome não pode exceder 100 caracteres.' })
  name!: string;

  @ApiProperty({
    example: 'minha-empresa-mobile',
    description: 'Identificador único em formato slug (letras minúsculas e hífens)',
  })
  @IsString({ message: 'O slug deve ser um texto.' })
  @IsNotEmpty({ message: 'O slug é obrigatório.' })
  @MinLength(2, { message: 'O slug deve ter no mínimo 2 caracteres.' })
  @MaxLength(50, { message: 'O slug não pode exceder 50 caracteres.' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'O slug deve conter apenas letras minúsculas, números e hífens (ex: empresa-mobile).',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: '12.345.678/0001-90',
    description: 'CNPJ ou CPF do titular da organização',
  })
  @IsOptional()
  @IsString()
  documentCnpjCpf?: string;

  @ApiPropertyOptional({
    example: 'FREE',
    default: 'FREE',
    description: 'Nível de plano da organização (FREE, PRO, ENTERPRISE)',
  })
  @IsOptional()
  @IsString()
  planTier?: string;
}
