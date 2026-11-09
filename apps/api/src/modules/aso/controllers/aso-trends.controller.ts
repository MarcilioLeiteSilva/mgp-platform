import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { AsoTrendsService } from '../services/aso-trends.service';
import {
  BreakoutsQueryDto,
  CategoryTrendsQueryDto,
  TrendingKeywordsQueryDto,
  TrendAlertsQueryDto,
} from '../dto/aso-trends.dto';
import {
  BreakoutAppDto,
  CategoryTrendSummaryDto,
  TrendingKeywordDto,
  TrendAlertDto,
} from '@mgp/contracts';

@ApiTags('ASO â€” TendÃªncias de Mercado e Apps em AscensÃ£o')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-organization-id',
  required: true,
  description: 'UUID da organizaÃ§Ã£o ativa (Tenant)',
})
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('api/v1/aso/trends')
export class AsoTrendsController {
  constructor(private readonly trendsService: AsoTrendsService) {}

  @Get('categories/:category')
  @ApiOperation({
    summary: 'Consultar tendÃªncias consolidadas e breakouts de uma categoria',
    description:
      'Retorna resumo setorial, aplicativos em ascensÃ£o rÃ¡pida e termos de busca em destaque para a categoria informada.',
  })
  @ApiParam({
    name: 'category',
    description: 'Nome da categoria (ex: GAME, FINANCE, SHOPPING, TOOLS, OVERALL)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo de tendÃªncias da categoria.',
  })
  async getCategoryTrends(
    @Param('category') category: string,
    @TenantId() organizationId: string,
    @Query() query: CategoryTrendsQueryDto,
  ): Promise<CategoryTrendSummaryDto> {
    return this.trendsService.getCategoryTrends(category, query.country || 'BR', organizationId);
  }

  @Get('breakouts')
  @ApiOperation({
    summary: 'Listar aplicativos em rÃ¡pida ascensÃ£o (Breakout Apps)',
    description:
      'Retorna apps com salto acelerado em rankings, downloads e velocidade de avaliaÃ§Ãµes, ordenados por Breakout Score.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de aplicativos em destaque no mercado.',
  })
  async getBreakoutApps(
    @TenantId() organizationId: string,
    @Query() query: BreakoutsQueryDto,
  ): Promise<BreakoutAppDto[]> {
    return this.trendsService.getBreakoutApps(query, organizationId);
  }

  @Get('keywords')
  @ApiOperation({
    summary: 'Listar palavras-chave em tendÃªncia de crescimento',
    description:
      'Retorna termos de pesquisa com alto volume, rÃ¡pido crescimento recente e Ã­ndice de oportunidade atrativo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Palavras-chave em ascensÃ£o.',
  })
  async getTrendingKeywords(
    @Query() query: TrendingKeywordsQueryDto,
  ): Promise<TrendingKeywordDto[]> {
    return this.trendsService.getTrendingKeywords(query);
  }

  @Get('alerts')
  @ApiOperation({
    summary: 'Consultar feed de alertas de oportunidades e tendÃªncias da organizaÃ§Ã£o',
    description:
      'Retorna notificaÃ§Ãµes inteligentes geradas sobre concorrentes em alta e novos entrantes no segmento.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de alertas da organizaÃ§Ã£o.',
  })
  async getOrganizationAlerts(
    @TenantId() organizationId: string,
    @Query() query: TrendAlertsQueryDto,
  ): Promise<TrendAlertDto[]> {
    return this.trendsService.getOrganizationAlerts(organizationId, query.unreadOnly);
  }

  @Patch('alerts/:id/read')
  @ApiOperation({
    summary: 'Marcar alerta de tendÃªncia como lido',
    description: 'Atualiza o status isRead do alerta para true.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do alerta de tendÃªncia',
  })
  @ApiResponse({
    status: 200,
    description: 'Alerta marcado como lido com sucesso.',
  })
  async markAlertAsRead(
    @Param('id') alertId: string,
    @TenantId() organizationId: string,
  ): Promise<TrendAlertDto> {
    return this.trendsService.markAlertAsRead(alertId, organizationId);
  }
}

