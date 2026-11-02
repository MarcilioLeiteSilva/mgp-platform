import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant, TenantId } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../common/interfaces/tenant-context.interface';
import { UserRole } from '@mgp/database';

@ApiTags('Organizações e Multi-Tenancy')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Lista organizações às quais o usuário logado pertence',
    description: 'Retorna a lista de organizações e o papel do usuário (OWNER, ADMIN, DEVELOPER, etc.) em cada uma.',
  })
  @ApiHeader({
    name: 'x-user-id',
    required: false,
    description: 'UUID do usuário autenticado',
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
  @ApiHeader({
    name: 'x-user-id',
    required: false,
    description: 'UUID do usuário criador',
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
  @ApiHeader({
    name: 'x-user-id',
    required: false,
    description: 'UUID do usuário requisitante',
  })
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
    summary: 'Adiciona um novo membro à organização (RBAC)',
    description: 'Permite que um OWNER ou ADMIN convide um usuário existente pelo e-mail e atribua um papel específico.',
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
    return this.orgService.addMember(organizationId, requesterUserId, dto);
  }
}
