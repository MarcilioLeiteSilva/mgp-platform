import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';

@ApiTags('Organizações e Multi-Tenancy')
@ApiBearerAuth('JWT-auth')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Lista organizações às quais o usuário logado pertence',
    description: 'Retorna a lista de organizações e o papel do usuário (OWNER, ADMIN, DEVELOPER, etc.) em cada uma.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de organizações retornada com sucesso.',
  })
  async listUserOrganizations(@Req() req: any, @Headers('x-user-id') headerUserId?: string) {
    const userId = req.user?.id || headerUserId || 'user_demo_default';
    return this.orgService.listUserOrganizations(userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria uma nova organização (Tenant)',
    description: 'Cria uma organização, define o criador como OWNER e inicializa a Carteira com 3 contas contábeis.',
  })
  @ApiResponse({
    status: 201,
    description: 'Organização e Carteira provisionadas com sucesso.',
  })
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = req.user?.id || headerUserId || 'user_demo_default';
    return this.orgService.createOrganization(userId, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtém detalhes de uma organização com isolamento de tenant',
    description: 'Retorna os dados da organização, contas da carteira e contadores. Bloqueia acesso caso o usuário não pertença a ela.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiResponse({
    status: 200,
    description: 'Detalhes da organização retornados com sucesso.',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado: O usuário não possui membresia nesta organização.',
  })
  async getOrganization(
    @Param('id') organizationId: string,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.findById(organizationId, userId, isSuperadmin);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza dados cadastrais da organização (OWNER ou ADMIN)',
    description: 'Permite alterar o nome, CNPJ/CPF ou plano da organização.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiResponse({ status: 200, description: 'Organização atualizada com sucesso.' })
  async updateOrganization(
    @Param('id') organizationId: string,
    @Body() dto: UpdateOrganizationDto,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.updateOrganization(organizationId, userId, dto, isSuperadmin);
  }

  @Patch(':id/default')
  @ApiOperation({
    summary: 'Define a organização como padrão para o usuário logado',
    description: 'Atualiza a organização default do usuário para que seja selecionada automaticamente no dashboard.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiResponse({ status: 200, description: 'Organização definida como padrão com sucesso.' })
  async setDefaultOrganization(
    @Param('id') organizationId: string,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = req.user?.id || headerUserId || 'user_demo_default';
    return this.orgService.setDefaultOrganization(organizationId, userId);
  }

  // ==============================================================================
  // Gestão de Membros e RBAC
  // ==============================================================================

  @Get(':id/members')
  @ApiOperation({
    summary: 'Lista os membros de uma organização',
    description: 'Exibe todos os usuários vinculados à organização e seus respectivos papéis.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiResponse({
    status: 200,
    description: 'Lista de membros retornada com sucesso.',
  })
  async listMembers(
    @Param('id') organizationId: string,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const userId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.listMembers(organizationId, userId, isSuperadmin);
  }

  @Post(':id/members')
  @ApiOperation({
    summary: 'Adiciona um novo membro diretamente à organização (RBAC)',
    description: 'Permite que um OWNER ou ADMIN adicione um usuário já cadastrado pelo e-mail e atribua um papel específico.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiResponse({
    status: 201,
    description: 'Membro adicionado com sucesso.',
  })
  async addMember(
    @Param('id') organizationId: string,
    @Body() dto: AddMemberDto,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const requesterUserId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.addMember(organizationId, requesterUserId, dto, isSuperadmin);
  }

  @Patch(':id/members/:memberUserId')
  @ApiOperation({
    summary: 'Altera o papel RBAC de um membro (OWNER ou ADMIN)',
    description: 'Modifica o nível de privilégio do membro. Não permite rebaixar o único OWNER da organização.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiParam({ name: 'memberUserId', description: 'UUID do usuário membro alvo' })
  @ApiResponse({ status: 200, description: 'Papel do membro atualizado com sucesso.' })
  async updateMemberRole(
    @Param('id') organizationId: string,
    @Param('memberUserId') memberUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const requesterUserId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.updateMemberRole(organizationId, requesterUserId, memberUserId, dto, isSuperadmin);
  }

  @Delete(':id/members/:memberUserId')
  @ApiOperation({
    summary: 'Remove um membro da organização ou sai voluntariamente',
    description: 'Permite ao gestor remover um usuário ou ao próprio membro sair da equipe. Impede a saída/remoção do único OWNER.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiParam({ name: 'memberUserId', description: 'UUID do membro a ser removido' })
  @ApiResponse({ status: 200, description: 'Membro removido ou desligado com sucesso.' })
  async removeMember(
    @Param('id') organizationId: string,
    @Param('memberUserId') memberUserId: string,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const requesterUserId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.removeMember(organizationId, requesterUserId, memberUserId, isSuperadmin);
  }

  @Post(':id/transfer-ownership')
  @ApiOperation({
    summary: 'Transfere a posse (OWNER) da organização para outro membro',
    description: 'Transação atômica que concede o papel OWNER ao usuário indicado e rebaixa o proprietário anterior para ADMIN.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiResponse({ status: 200, description: 'Posse transferida com sucesso.' })
  async transferOwnership(
    @Param('id') organizationId: string,
    @Body() dto: TransferOwnershipDto,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const requesterUserId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.transferOwnership(organizationId, requesterUserId, dto, isSuperadmin);
  }

  // ==============================================================================
  // Gestão de Convites (Invitations)
  // ==============================================================================

  @Post(':id/invitations')
  @ApiOperation({
    summary: 'Cria e envia um convite para um e-mail (OWNER ou ADMIN)',
    description: 'Gera um token criptográfico único com validade de 7 dias para que o profissional ingresse na equipe.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiResponse({ status: 201, description: 'Convite criado com sucesso.' })
  async createInvitation(
    @Param('id') organizationId: string,
    @Body() dto: CreateInvitationDto,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const requesterUserId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.createInvitation(organizationId, requesterUserId, dto, isSuperadmin);
  }

  @Get(':id/invitations')
  @ApiOperation({
    summary: 'Lista todos os convites pendentes da organização',
    description: 'Visualiza convites emitidos, status e prazos de expiração.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiResponse({ status: 200, description: 'Lista de convites retornada.' })
  async listInvitations(
    @Param('id') organizationId: string,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const requesterUserId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.listInvitations(organizationId, requesterUserId, isSuperadmin);
  }

  @Delete(':id/invitations/:invitationId')
  @ApiOperation({
    summary: 'Revoga um convite pendente da organização',
    description: 'Invalida o token do convite antes que seja aceito.',
  })
  @ApiParam({ name: 'id', description: 'UUID da organização' })
  @ApiParam({ name: 'invitationId', description: 'UUID do convite a ser cancelado' })
  @ApiResponse({ status: 200, description: 'Convite revogado com sucesso.' })
  async revokeInvitation(
    @Param('id') organizationId: string,
    @Param('invitationId') invitationId: string,
    @Req() req: any,
    @Headers('x-user-id') headerUserId?: string,
  ) {
    const requesterUserId = req.user?.id || headerUserId || 'user_demo_default';
    const isSuperadmin = req.user?.isSuperadmin || false;
    return this.orgService.revokeInvitation(organizationId, invitationId, requesterUserId, isSuperadmin);
  }
}
