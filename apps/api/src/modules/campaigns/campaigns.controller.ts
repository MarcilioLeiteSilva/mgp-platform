import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  UpdateCampaignStatusDto,
  CreateCreativeDto,
  UpdateCreativeDto,
  ListCampaignsQueryDto,
} from './dto';

@ApiTags('Campanhas Publicitárias e Criativos')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista campanhas da organização ativa (Multi-Tenant)',
    description: 'Retorna a listagem paginada de campanhas publicitárias com seus criativos ativos e contadores.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 200, description: 'Campanhas retornadas com sucesso.' })
  async listCampaigns(
    @Query() query: ListCampaignsQueryDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.campaignsService.listCampaigns(organizationId, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Cria uma nova campanha publicitária',
    description: 'Cadastra uma campanha com regras de leilão RTB, orçamento diário/total e frequency capping.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 201, description: 'Campanha criada com sucesso (status DRAFT).' })
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.campaignsService.createCampaign(organizationId, dto, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consulta detalhes de uma campanha específica',
    description: 'Retorna a campanha completa com todos os seus criativos cadastrados.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha' })
  @ApiResponse({ status: 200, description: 'Detalhes da campanha retornados.' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada na organização.' })
  async findCampaignById(
    @Param('id') campaignId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.campaignsService.findCampaignById(campaignId, organizationId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza dados cadastrais ou parâmetros de leilão da campanha',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha' })
  @ApiResponse({ status: 200, description: 'Campanha atualizada com sucesso.' })
  async updateCampaign(
    @Param('id') campaignId: string,
    @Body() dto: UpdateCampaignDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.campaignsService.updateCampaign(campaignId, organizationId, dto, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Altera o status operacional da campanha (ACTIVE, PAUSED, DRAFT, COMPLETED)',
    description: 'Ativação requer pelo menos um criativo ativo e saldo suficiente na carteira de anunciante.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha' })
  @ApiResponse({ status: 200, description: 'Status alterado com sucesso.' })
  async updateCampaignStatus(
    @Param('id') campaignId: string,
    @Body() dto: UpdateCampaignStatusDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.campaignsService.updateCampaignStatus(campaignId, organizationId, dto, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Exclui uma campanha inativa da organização',
    description: 'Não permite exclusão direta de campanhas em veiculação ativa (necessário pausar antes).',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha' })
  @ApiResponse({ status: 200, description: 'Campanha excluída com sucesso.' })
  async deleteCampaign(
    @Param('id') campaignId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.campaignsService.deleteCampaign(campaignId, organizationId, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  // ==============================================================================
  // Rotas de Criativos
  // ==============================================================================

  @Get(':id/creatives')
  @ApiOperation({
    summary: 'Lista todos os criativos de uma campanha',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha' })
  @ApiResponse({ status: 200, description: 'Lista de criativos retornada.' })
  async listCreatives(
    @Param('id') campaignId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.campaignsService.listCreatives(campaignId, organizationId);
  }

  @Post(':id/creatives')
  @ApiOperation({
    summary: 'Adiciona um novo criativo à campanha (Banner, Native, Interstitial ou Rewarded)',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha' })
  @ApiResponse({ status: 201, description: 'Criativo criado com sucesso.' })
  async addCreative(
    @Param('id') campaignId: string,
    @Body() dto: CreateCreativeDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.campaignsService.addCreative(campaignId, organizationId, dto, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Patch(':id/creatives/:creativeId')
  @ApiOperation({
    summary: 'Atualiza propriedades ou ativa/desativa um criativo',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha' })
  @ApiParam({ name: 'creativeId', description: 'UUID do criativo' })
  @ApiResponse({ status: 200, description: 'Criativo atualizado com sucesso.' })
  async updateCreative(
    @Param('id') campaignId: string,
    @Param('creativeId') creativeId: string,
    @Body() dto: UpdateCreativeDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.campaignsService.updateCreative(campaignId, creativeId, organizationId, dto, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Delete(':id/creatives/:creativeId')
  @ApiOperation({
    summary: 'Exclui um criativo da campanha',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da campanha' })
  @ApiParam({ name: 'creativeId', description: 'UUID do criativo' })
  @ApiResponse({ status: 200, description: 'Criativo excluído com sucesso.' })
  async deleteCreative(
    @Param('id') campaignId: string,
    @Param('creativeId') creativeId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.campaignsService.deleteCreative(campaignId, creativeId, organizationId, {
      userId,
      ipAddress,
      userAgent,
    });
  }
}

