import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@mgp/database';

export class CreateInvitationDto {
  @ApiProperty({
    example: 'novo.membro@empresa.com.br',
    description: 'E-mail do profissional convidado para a organização',
  })
  @IsEmail({}, { message: 'Forneça um e-mail válido para o convite.' })
  @IsNotEmpty({ message: 'O e-mail do convite é obrigatório.' })
  email!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.DEVELOPER,
    description: 'Papel que será atribuído ao convidado ao aceitar (RBAC)',
  })
  @IsEnum(UserRole, {
    message: `O papel deve ser um dos seguintes: ${Object.values(UserRole).join(', ')}`,
  })
  @IsNotEmpty({ message: 'O papel do convite é obrigatório.' })
  role!: UserRole;
}
