import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Convites de Organização')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Consulta detalhes de um convite pelo token público',
    description: 'Permite ao convidado ver o nome da organização, papel e prazo antes de aceitar.',
  })
  @ApiParam({ name: 'token', description: 'Token hexadecimal do convite' })
  @ApiResponse({ status: 200, description: 'Dados do convite retornados com sucesso.' })
  @ApiResponse({ status: 404, description: 'Convite não encontrado ou inválido.' })
  @ApiResponse({ status: 400, description: 'Convite expirado ou já processado.' })
  async getInvitation(@Param('token') token: string) {
    return this.orgService.getInvitationByToken(token);
  }

  @Post(':token/accept')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Aceita um convite com a conta do usuário autenticado',
    description: 'Vincula o usuário logado à organização com o papel especificado no convite.',
  })
  @ApiParam({ name: 'token', description: 'Token hexadecimal do convite' })
  @ApiResponse({ status: 200, description: 'Convite aceito com sucesso.' })
  @ApiResponse({ status: 401, description: 'Usuário não autenticado.' })
  async acceptInvitation(
    @Param('token') token: string,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = req.user?.id || headerUserId;
    if (!userId) {
      throw new UnauthorizedException('Você precisa estar autenticado para aceitar um convite.');
    }
    return this.orgService.acceptInvitation(token, userId);
  }
}
