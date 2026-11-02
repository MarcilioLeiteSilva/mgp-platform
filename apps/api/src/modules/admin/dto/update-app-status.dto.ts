import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AppStatus } from '@mgp/database';

export class UpdateAppStatusDto {
  @ApiProperty({
    description: 'Status de moderação e veiculação do aplicativo',
    enum: AppStatus,
    example: AppStatus.ACTIVE,
  })
  @IsEnum(AppStatus)
  status!: AppStatus;
}
