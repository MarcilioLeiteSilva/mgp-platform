import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Refresh token de alta entropia emitido no login ou registro',
  })
  @IsString({ message: 'O refreshToken deve ser uma string.' })
  @IsNotEmpty({ message: 'O refreshToken é obrigatório.' })
  refreshToken!: string;
}

