import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@mgp/database';

export class TokensDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Access Token JWT com validade de 15 minutos',
  })
  accessToken!: string;

  @ApiProperty({
    example: 'd9b2d63d-a7f4-4e9b-b53e-32b0a1d48c90',
    description: 'Refresh Token com rotação obrigatória (validade de 7 dias)',
  })
  refreshToken!: string;

  @ApiProperty({
    example: 900,
    description: 'Tempo de expiração do access token em segundos (15m = 900s)',
  })
  expiresIn!: number;

  @ApiProperty({
    example: 'Bearer',
    description: 'Tipo de autorização para o header Authorization',
  })
  tokenType!: string;
}

export class UserSummaryDto {
  @ApiProperty({ example: 'usr_carlos_123' })
  id!: string;

  @ApiProperty({ example: 'carlos@estudiomobile.com' })
  email!: string;

  @ApiProperty({ example: 'Carlos Mendes' })
  fullName!: string;

  @ApiProperty({ example: false })
  isSuperadmin!: boolean;
}

export class OrganizationSummaryDto {
  @ApiProperty({ example: 'org_estudio_123' })
  id!: string;

  @ApiProperty({ example: 'Estúdio Mobile Brasil' })
  name!: string;

  @ApiProperty({ example: 'estudio-mobile-brasil' })
  slug!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.OWNER })
  role!: UserRole;
}

export class AuthResponseDto {
  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto;

  @ApiProperty({ type: OrganizationSummaryDto })
  organization!: OrganizationSummaryDto;

  @ApiProperty({ type: TokensDto })
  tokens!: TokensDto;
}

