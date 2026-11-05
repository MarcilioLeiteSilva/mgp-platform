import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { AsoAppsService } from '../services/aso-apps.service';
import { AsoKeywordsService } from '../services/aso-keywords.service';
import { AsoAuditService } from '../services/aso-audit.service';
import {
  KeywordRankingHistoryQueryDto,
  ListAsoAppsQueryDto,
  TrackAppDto,
  TrackKeywordDto,
} from '../dto';

@ApiTags('ASO — Gestão e Inteligência Orgânica')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-organization-id',
  required: true,
  description: 'UUID da organização ativa (Tenant)',
})
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('aso')
export class AsoController {
  constructor(
    private readonly appsService: AsoAppsService,
    private readonly keywordsService: AsoKeywordsService,
    private readonly auditService: AsoAuditService,
  ) {}

  private resolveOrgId(tenantId?: string, headerOrgId?: string, req?: any): string {
    return tenantId || req?.tenant?.organizationId || headerOrgId;
  }

  // ==============================================================================
  // 1. Gestão de Aplicativos Monitorados e Concorrentes
  // ==============================================================================

  @Post('apps')
  @ApiOperation({
    summary: 'Cadastra e inicia o monitoramento de um aplicativo na loja',
    description:
      'Coleta os metadados em tempo real na Google Play Store, cadastra no catálogo da organização e executa a primeira auditoria ASO heurística.',
  })
  @ApiResponse({
    status: 201,
    description: 'Aplicativo monitorado cadastrado com sucesso.',
  })
  async trackApp(
    @Body() dto: TrackAppDto,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.appsService.trackApp(orgId, dto);
  }

  @Get('apps')
  @ApiOperation({
    summary: 'Lista os aplicativos monitorados da organização ativa',
    description:
      'Retorna lista paginada com contagem de palavras-chave rastreadas e o último score de auditoria de cada app.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de aplicativos retornada com sucesso.',
  })
  async listApps(
    @Query() query: ListAsoAppsQueryDto,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.appsService.listApps(orgId, query);
  }

  @Get('apps/:id')
  @ApiOperation({
    summary: 'Obtém detalhes de um aplicativo monitorado',
    description: 'Retorna metadados completos e o diagnóstico recente do aplicativo.',
  })
  @ApiParam({ name: 'id', description: 'UUID do registro do app monitorado' })
  @ApiResponse({ status: 200, description: 'Detalhes do aplicativo retornados.' })
  @ApiResponse({ status: 404, description: 'Aplicativo não encontrado.' })
  async getAppById(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.appsService.getAppById(orgId, id);
  }

  @Post('apps/:id/sync')
  @ApiOperation({
    summary: 'Sincroniza metadados frescos da loja para um aplicativo',
    description:
      'Busca os dados mais recentes na Google Play (notas, downloads, prints) e recalcula a auditoria ASO.',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiResponse({ status: 200, description: 'Metadados sincronizados com sucesso.' })
  async syncApp(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.appsService.syncApp(orgId, id);
  }

  @Delete('apps/:id')
  @ApiOperation({
    summary: 'Remove um aplicativo do monitoramento da organização',
    description: 'Remove em cascata as palavras-chave vinculadas e históricos associados.',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiResponse({ status: 200, description: 'Aplicativo removido com sucesso.' })
  async deleteApp(
    @Param('id') id: string,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.appsService.deleteApp(orgId, id);
  }

  // ==============================================================================
  // 2. Rastreamento e Inteligência de Palavras-chave
  // ==============================================================================

  @Post('apps/:id/keywords')
  @ApiOperation({
    summary: 'Adiciona uma palavra-chave para rastreamento de posicionamento',
    description:
      'Verifica imediatamente o rank atual do aplicativo na Play Store para o termo e inicia o acompanhamento diário.',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiResponse({ status: 201, description: 'Palavra-chave adicionada com rank inicial.' })
  async trackKeyword(
    @Param('id') asoAppId: string,
    @Body() dto: TrackKeywordDto,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.keywordsService.trackKeyword(orgId, asoAppId, dto);
  }

  @Get('apps/:id/keywords')
  @ApiOperation({
    summary: 'Lista todas as palavras-chave rastreadas para o aplicativo',
    description:
      'Retorna posição atual, posição anterior, melhor posição histórica e métricas de dificuldade/volume.',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiResponse({ status: 200, description: 'Lista de palavras-chave rastreadas.' })
  async listTrackedKeywords(
    @Param('id') asoAppId: string,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.keywordsService.listTrackedKeywords(orgId, asoAppId);
  }

  @Post('apps/:id/keywords/:keywordId/check')
  @ApiOperation({
    summary: 'Força a rechecagem imediata do posicionamento de uma palavra-chave',
    description:
      'Executa busca na loja, recalcula a posição no ranking e salva um ponto no histórico temporal.',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiParam({ name: 'keywordId', description: 'UUID da palavra-chave cadastrada' })
  @ApiResponse({ status: 200, description: 'Posição recalculada com sucesso.' })
  async checkRank(
    @Param('id') asoAppId: string,
    @Param('keywordId') keywordId: string,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.keywordsService.checkRank(orgId, asoAppId, keywordId);
  }

  @Get('apps/:id/keywords/:keywordId/history')
  @ApiOperation({
    summary: 'Obtém a série temporal de histórico de posições da palavra-chave',
    description: 'Alimenta gráficos de evolução do ranking para análise de ganho/perda de posições.',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiParam({ name: 'keywordId', description: 'UUID da palavra-chave' })
  @ApiResponse({ status: 200, description: 'Histórico temporal de posições.' })
  async getKeywordHistory(
    @Param('id') asoAppId: string,
    @Param('keywordId') keywordId: string,
    @Query() query: KeywordRankingHistoryQueryDto,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.keywordsService.getKeywordHistory(
      orgId,
      asoAppId,
      keywordId,
      query.days,
    );
  }

  @Delete('apps/:id/keywords/:keywordId')
  @ApiOperation({
    summary: 'Remove o rastreamento de uma palavra-chave para o aplicativo',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiParam({ name: 'keywordId', description: 'UUID da palavra-chave' })
  @ApiResponse({ status: 200, description: 'Palavra-chave desvinculada com sucesso.' })
  async untrackKeyword(
    @Param('id') asoAppId: string,
    @Param('keywordId') keywordId: string,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.keywordsService.untrackKeyword(orgId, asoAppId, keywordId);
  }

  // ==============================================================================
  // 3. Auditoria Heurística e Checklist ASO
  // ==============================================================================

  @Post('apps/:id/audit')
  @ApiOperation({
    summary: 'Executa a auditoria heurística completa de ASO do aplicativo',
    description:
      'Avalia título, resumo, descrição longa, prints, ícone e notas, gerando pontuações e recomendações acionáveis.',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiResponse({ status: 201, description: 'Auditoria calculada e salva com sucesso.' })
  async runAudit(
    @Param('id') asoAppId: string,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.auditService.runAudit(orgId, asoAppId);
  }

  @Get('apps/:id/audit/latest')
  @ApiOperation({
    summary: 'Obtém a auditoria ASO mais recente do aplicativo com recomendações',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiResponse({ status: 200, description: 'Último laudo de auditoria retornado.' })
  async getLatestAudit(
    @Param('id') asoAppId: string,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.auditService.getLatestAudit(orgId, asoAppId);
  }

  @Get('apps/:id/audit/history')
  @ApiOperation({
    summary: 'Histórico de pontuações de auditoria do aplicativo',
    description: 'Permite acompanhar a evolução da qualidade da página da loja ao longo do tempo.',
  })
  @ApiParam({ name: 'id', description: 'UUID do aplicativo monitorado' })
  @ApiResponse({ status: 200, description: 'Histórico de auditorias retornado.' })
  async getAuditHistory(
    @Param('id') asoAppId: string,
    @TenantId() tenantId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const orgId = this.resolveOrgId(tenantId, orgIdHeader, req);
    return this.auditService.getAuditHistory(orgId, asoAppId);
  }
}

