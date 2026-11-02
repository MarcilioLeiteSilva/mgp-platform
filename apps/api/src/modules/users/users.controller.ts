import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Req,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Usuários')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Obtém o perfil do usuário autenticado',
    description: 'Retorna dados cadastrais, lista de organizações vinculadas, papel em cada uma e contagem de sessões ativas.',
  })
  @ApiResponse({ status: 200, description: 'Perfil retornado com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autenticado.' })
  async getMyProfile(@Req() req: any, @Headers('x-user-id') headerUserId?: string) {
    const userId = req.user?.id || headerUserId;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Atualiza o perfil do usuário autenticado',
    description: 'Permite alterar o nome completo do usuário logado.',
  })
  @ApiResponse({ status: 200, description: 'Perfil atualizado com sucesso.' })
  async updateMyProfile(
    @Body() dto: UpdateProfileDto,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = req.user?.id || headerUserId;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('me/change-password')
  @ApiOperation({
    summary: 'Altera a senha do usuário autenticado',
    description: 'Valida a senha atual, aplica a nova com hash Bcrypt cost 12 e revoga todas as sessões anteriores por segurança.',
  })
  @ApiResponse({ status: 200, description: 'Senha alterada com sucesso.' })
  @ApiResponse({ status: 400, description: 'Senha atual incorreta ou nova senha inválida.' })
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = req.user?.id || headerUserId;
    if (!userId) {
      throw new UnauthorizedException('Usuário não autenticado.');
    }
    return this.usersService.changePassword(userId, dto);
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Obtém dados de perfil por ID' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Perfil retornado.' })
  async getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }
}
