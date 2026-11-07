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
import { AdUnitsService } from './ad-units.service';
import {
  CreateAdUnitDto,
  UpdateAdUnitDto,
  ListAdUnitsQueryDto,
  PublisherAnalyticsQueryDto,
} from './dto';

@ApiTags('Ad Units e Monetização de Publishers')
@Controller('ad-units')
export class AdUnitsController {
  constructor(private readonly adUnitsService: AdUnitsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista blocos de anúncios (Ad Units) da organização (Multi-Tenant)',
    description: 'Retorna a listagem paginada de Ad Units vinculadas aos aplicativos da organização com filtros.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização ativa (Tenant)',
  })
  @ApiResponse({ status: 200, description: 'Lista de Ad Units retornada com sucesso.' })
  async listAdUnits(
    @Query() query: ListAdUnitsQueryDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.adUnitsService.listAdUnits(organizationId, query);
  }

  @Post()
  @ApiOperation({
    summary: 'Cadastra um novo bloco de anúncios (Ad Unit) para um aplicativo',
    description: 'Valida se o aplicativo pertence à organização ativa e configura o floor eCPM.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização ativa (Tenant)',
  })
  @ApiResponse({ status: 201, description: 'Ad Unit criada com sucesso.' })
  async createAdUnit(
    @Body() dto: CreateAdUnitDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.adUnitsService.createAdUnit(organizationId, dto, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Relatório analítico de monetização do publisher',
    description: 'Calcula receita bruta, repasse ao publisher (70% rev-share), eCPM efetivo e fill rate agregado.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização ativa (Tenant)',
  })
  @ApiResponse({ status: 200, description: 'Relatório de monetização gerado.' })
  async getPublisherAnalytics(
    @Query() query: PublisherAnalyticsQueryDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.adUnitsService.getPublisherAnalytics(organizationId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Consulta detalhes de um bloco de anúncios específico',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização ativa (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da Ad Unit' })
  @ApiResponse({ status: 200, description: 'Detalhes da Ad Unit retornados.' })
  @ApiResponse({ status: 404, description: 'Ad Unit não encontrada nesta organização.' })
  async findAdUnitById(
    @Param('id') adUnitId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.adUnitsService.findAdUnitById(adUnitId, organizationId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza propriedades de uma Ad Unit (nome, floor eCPM, placement, status)',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização ativa (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da Ad Unit' })
  @ApiResponse({ status: 200, description: 'Ad Unit atualizada com sucesso.' })
  async updateAdUnit(
    @Param('id') adUnitId: string,
    @Body() dto: UpdateAdUnitDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.adUnitsService.updateAdUnit(adUnitId, organizationId, dto, {
      userId,
      ipAddress,
      userAgent,
    });
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Exclui um bloco de anúncios da organização',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização ativa (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID da Ad Unit' })
  @ApiResponse({ status: 200, description: 'Ad Unit excluída com sucesso.' })
  async deleteAdUnit(
    @Param('id') adUnitId: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const userId = req?.user?.id;
    const ipAddress = req?.ip;
    const userAgent = req?.headers?.['user-agent'];

    return this.adUnitsService.deleteAdUnit(adUnitId, organizationId, {
      userId,
      ipAddress,
      userAgent,
    });
  }
}

