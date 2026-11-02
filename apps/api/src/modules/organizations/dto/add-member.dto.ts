import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@mgp/database';

export class AddMemberDto {
  @ApiProperty({
    example: 'analista@empresa.com.br',
    description: 'E-mail do usuário a ser adicionado à organização',
  })
  @IsEmail({}, { message: 'Forneça um e-mail válido para o novo membro.' })
  @IsNotEmpty({ message: 'O e-mail do membro é obrigatório.' })
  email!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.DEVELOPER,
    description: 'Papel atribuído ao usuário na organização (RBAC)',
  })
  @IsEnum(UserRole, {
    message: `O papel deve ser um dos seguintes: ${Object.values(UserRole).join(', ')}`,
  })
  @IsNotEmpty({ message: 'O papel do membro é obrigatório.' })
  role!: UserRole;
}
