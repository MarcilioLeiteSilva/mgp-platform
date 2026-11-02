import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Usuários')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id/profile')
  @ApiOperation({ summary: 'Obtém dados de perfil do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Perfil retornado.' })
  async getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }
}

