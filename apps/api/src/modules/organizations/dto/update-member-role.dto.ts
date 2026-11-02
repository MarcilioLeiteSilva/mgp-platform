import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '@mgp/database';

export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: UserRole,
    example: UserRole.MANAGER,
    description: 'Novo papel atribuído ao usuário na organização (RBAC)',
  })
  @IsEnum(UserRole, {
    message: `O papel deve ser um dos seguintes: ${Object.values(UserRole).join(', ')}`,
  })
  @IsNotEmpty({ message: 'O novo papel é obrigatório.' })
  role!: UserRole;
}
