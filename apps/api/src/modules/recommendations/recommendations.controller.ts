import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import {
  ApplyRecommendationDto,
  DismissRecommendationDto,
  ListRecommendationsQueryDto,
  SimulateBidDto,
  UpdateBiddingStrategyDto,
} from './dto';

@ApiTags('Recomendações e Otimização de Lances (Smart Bidding)')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista recomendações geradas para a organização (Multi-Tenant)',
    description: 'Retorna recomendações ativas categorizadas por impacto e prioridade.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 200, description: 'Recomendações retornadas com sucesso.' })
  async listRecommendations(
    @Query() query: ListRecommendationsQueryDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.service.listRecommendations(organizationId, query);
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Executa motor de análise heurística e gera novas recomendações',
    description: 'Avalia taxa de vitória no RTB, consumo de budget diário e fadiga de criativos.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 201, description: 'Análise concluída e recomendações criadas.' })
  async generateRecommendations(
    @Query('campaignId') campaignId?: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.service.generateRecommendations(organizationId, campaignId);
  }

  @Post(':id/apply')
  @ApiOperation({
    summary: 'Aplica recomendação na campanha com 1 clique (One-Click Apply)',
    description: 'Atualiza o lance ou estratégia da campanha de forma atômica no banco de dados com auditoria.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da recomendação' })
  @ApiResponse({ status: 200, description: 'Recomendação aplicada com sucesso.' })
  @ApiResponse({ status: 404, description: 'Recomendação não encontrada.' })
  async applyRecommendation(
    @Param('id') id: string,
    @Body() dto: ApplyRecommendationDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const user = {
      id: req?.user?.id || 'sys-user',
      email: req?.user?.email || 'user@mgp.local',
    };
    return this.service.applyRecommendation(organizationId, id, user, dto);
  }

  @Post(':id/dismiss')
  @ApiOperation({
    summary: 'Descarta uma recomendação sugerida',
    description: 'Marca o status como DISMISSED para não mais exibir no painel.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da recomendação' })
  @ApiResponse({ status: 200, description: 'Recomendação descartada.' })
  async dismissRecommendation(
    @Param('id') id: string,
    @Body() dto: DismissRecommendationDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.service.dismissRecommendation(organizationId, id, dto);
  }

  @Patch('campaigns/:campaignId/bidding-strategy')
  @ApiOperation({
    summary: 'Configura a estratégia de lances e pacing da campanha',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'campaignId', description: 'UUID da campanha' })
  @ApiResponse({ status: 200, description: 'Estratégia de lances atualizada com sucesso.' })
  async updateBiddingStrategy(
    @Param('campaignId') campaignId: string,
    @Body() dto: UpdateBiddingStrategyDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const user = {
      id: req?.user?.id || 'sys-user',
      email: req?.user?.email || 'user@mgp.local',
    };
    return this.service.updateBiddingStrategy(organizationId, campaignId, dto, user);
  }

  @Post('campaigns/:campaignId/simulate-bid')
  @ApiOperation({
    summary: 'Simula curvas de lances e avalia o pacing da campanha',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'campaignId', description: 'UUID da campanha' })
  @ApiResponse({ status: 200, description: 'Simulação retornada com sucesso.' })
  async simulateCampaignBid(
    @Param('campaignId') campaignId: string,
    @Body() dto: SimulateBidDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.service.simulateCampaignBid(organizationId, campaignId, dto);
  }
}

