import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserStatusDto {
  @ApiPropertyOptional({
    description: 'Status ativo do usuário na plataforma',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Privilégio de superadministrador global',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isSuperadmin?: boolean;
}
