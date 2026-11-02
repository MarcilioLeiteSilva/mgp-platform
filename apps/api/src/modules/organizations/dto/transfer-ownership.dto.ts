import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID do membro ativo que receberá a posse (OWNER) da organização',
  })
  @IsUUID('4', { message: 'O ID do novo proprietário deve ser um UUID v4 válido.' })
  @IsNotEmpty({ message: 'O ID do novo proprietário é obrigatório.' })
  newOwnerUserId!: string;
}
