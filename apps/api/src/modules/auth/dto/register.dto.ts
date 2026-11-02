import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'Carlos Mendes',
    description: 'Nome completo do usuário',
  })
  @IsString({ message: 'O nome completo deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome completo é obrigatório.' })
  @MinLength(3, { message: 'O nome completo deve ter no mínimo 3 caracteres.' })
  @MaxLength(100, { message: 'O nome completo não pode exceder 100 caracteres.' })
  fullName!: string;

  @ApiProperty({
    example: 'carlos@estudiomobile.com',
    description: 'E-mail corporativo único para login e notificações',
  })
  @IsEmail({}, { message: 'Forneça um endereço de e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @ApiProperty({
    example: 'SenhaForte@2026',
    description: 'Senha de acesso (mínimo 8 caracteres, contendo letras e números)',
  })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  @MinLength(8, { message: 'A senha deve possuir no mínimo 8 caracteres.' })
  @MaxLength(100, { message: 'A senha não pode exceder 100 caracteres.' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'A senha deve conter ao menos uma letra e um número.',
  })
  password!: string;

  @ApiProperty({
    example: 'Estúdio Mobile Brasil',
    description: 'Nome da organização inicial a ser criada',
  })
  @IsString({ message: 'O nome da organização deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome da organização é obrigatório.' })
  @MinLength(2, { message: 'O nome da organização deve ter no mínimo 2 caracteres.' })
  @MaxLength(100, { message: 'O nome da organização não pode exceder 100 caracteres.' })
  organizationName!: string;

  @ApiPropertyOptional({
    example: 'estudio-mobile-brasil',
    description: 'Identificador único da organização (slug). Se omitido, é gerado automaticamente.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'O slug deve conter apenas letras minúsculas, números e hífens.',
  })
  organizationSlug?: string;
}

