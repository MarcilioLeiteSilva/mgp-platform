import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'SenhaAtual123!',
    description: 'Senha atual do usuário para verificação prévia',
  })
  @IsString({ message: 'A senha atual deve ser uma string.' })
  @IsNotEmpty({ message: 'A senha atual é obrigatória.' })
  currentPassword!: string;

  @ApiProperty({
    example: 'NovaSenhaSegura456@',
    description: 'Nova senha forte (mínimo de 8 caracteres)',
  })
  @IsString({ message: 'A nova senha deve ser uma string.' })
  @IsNotEmpty({ message: 'A nova senha é obrigatória.' })
  @MinLength(8, { message: 'A nova senha deve ter no mínimo 8 caracteres.' })
  newPassword!: string;
}

