import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'carlos@estudiomobile.com',
    description: 'E-mail cadastrado na plataforma',
  })
  @IsEmail({}, { message: 'Forneça um endereço de e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório.' })
  email!: string;

  @ApiProperty({
    example: 'SenhaForte@2026',
    description: 'Senha de acesso',
  })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password!: string;
}

