import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationStatusDto {
  @ApiPropertyOptional({
    description: 'Plano da organização (ex: FREE, PRO, ENTERPRISE)',
    example: 'PRO',
  })
  @IsOptional()
  @IsString()
  planTier?: string;

  @ApiPropertyOptional({
    description: 'Status de verificação da organização',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}
