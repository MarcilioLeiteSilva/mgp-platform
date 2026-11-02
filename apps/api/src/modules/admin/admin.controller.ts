import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SuperadminGuard } from '../../common/guards/superadmin.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/user.decorator';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateOrganizationStatusDto } from './dto/update-organization-status.dto';
import { UpdateAppStatusDto } from './dto/update-app-status.dto';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { AppStatus } from '@mgp/database';

@ApiTags('Administração Central (Backoffice & NOC)')
@ApiBearerAuth('JWT-Auth')
@UseGuards(JwtAuthGuard, SuperadminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Visão geral operacional da plataforma para superadministradores' })
  @ApiResponse({ status: 200, description: 'Status operacional, infraestrutura e KPIs consolidados.' })
  async getSystemOverview() {
    return this.adminService.getSystemOverview();
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Listar todas as organizações da plataforma' })
  @ApiQuery({ name: 'search', required: false, description: 'Filtrar por nome ou slug' })
  async listOrganizations(@Query('search') search?: string) {
    return this.adminService.listOrganizations(search);
  }

  @Patch('organizations/:id/status')
  @ApiOperation({ summary: 'Atualizar plano e status de verificação de uma organização' })
  async updateOrganizationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationStatusDto,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateOrganizationStatus(id, dto, operatorId);
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar todos os usuários globais da plataforma' })
  @ApiQuery({ name: 'search', required: false, description: 'Filtrar por e-mail ou nome' })
  async listUsers(@Query('search') search?: string) {
    return this.adminService.listUsers(search);
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Ativar, suspender ou promover superadministrador' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateUserStatus(id, dto, operatorId);
  }

  @Get('apps')
  @ApiOperation({ summary: 'Listar todos os aplicativos cadastrados na rede MGP' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: AppStatus })
  async listApps(
    @Query('search') search?: string,
    @Query('status') status?: AppStatus,
  ) {
    return this.adminService.listApps(search, status);
  }

  @Patch('apps/:id/status')
  @ApiOperation({ summary: 'Moderar ou alterar status de um aplicativo' })
  async updateAppStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAppStatusDto,
    @CurrentUser('id') operatorId: string,
  ) {
    return this.adminService.updateAppStatus(id, dto, operatorId);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Consultar trilha de auditoria centralizada' })
  async getAuditLogs(@Query() query: AuditLogQueryDto) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('system/queues')
  @ApiOperation({ summary: 'Consultar estado e latência das filas assíncronas do sistema' })
  async getQueuesStatus() {
    return this.adminService.getQueuesStatus();
  }

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Exportar métricas do sistema no padrão Prometheus' })
  async getMetrics() {
    return this.adminService.getPrometheusMetrics();
  }
}
