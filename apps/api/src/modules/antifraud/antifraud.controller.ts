import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
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
import { AntifraudService } from './antifraud.service';
import {
  FraudMetricsQueryDto,
  ListFraudIncidentsQueryDto,
  ResolveFraudIncidentDto,
  SimulateIvtInspectionDto,
} from './dto';

@ApiTags('Controle de Fraudes e Detecção de Tráfego Inválido (IVT)')
@Controller('fraud')
export class AntifraudController {
  constructor(private readonly service: AntifraudService) {}

  @Get('overview')
  @Get('metrics')
  @ApiOperation({
    summary: 'Consolida métricas e KPIs de tráfego inválido (IVT) do tenant',
    description: 'Retorna taxa de IVT (%), eventos inspecionados, montante financeiro protegido e vetores GIVT/SIVT.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 200, description: 'Métricas retornadas com sucesso.' })
  async getMetrics(
    @Query() query: FraudMetricsQueryDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.service.getMetrics(organizationId, query);
  }

  @Get('incidents')
  @ApiOperation({
    summary: 'Lista incidentes de fraude detectados na rede (Multi-Tenant)',
    description: 'Retorna a listagem paginada de incidentes com filtros de severidade, categoria e status.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 200, description: 'Incidentes listados com sucesso.' })
  async listIncidents(
    @Query() query: ListFraudIncidentsQueryDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.service.listIncidents(organizationId, query);
  }

  @Get('incidents/:id')
  @ApiOperation({
    summary: 'Consulta detalhes técnicos e evidências forenses de um incidente',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID do incidente de fraude' })
  @ApiResponse({ status: 200, description: 'Detalhes do incidente retornados.' })
  @ApiResponse({ status: 404, description: 'Incidente não encontrado.' })
  async getIncidentById(
    @Param('id') id: string,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.service.getIncidentById(organizationId, id);
  }

  @Post('incidents/:id/resolve')
  @ApiOperation({
    summary: 'Resolve um incidente de fraude com opção de estorno financeiro (Chargeback)',
    description: 'Atualiza o status para CONFIRMED ou DISMISSED e, opcionalmente, estorna o valor no WalletLedger.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiParam({ name: 'id', description: 'UUID do incidente de fraude' })
  @ApiResponse({ status: 200, description: 'Incidente resolvido com sucesso.' })
  async resolveIncident(
    @Param('id') id: string,
    @Body() dto: ResolveFraudIncidentDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    const user = {
      id: req?.user?.id || 'sys-antifraud',
      email: req?.user?.email || 'security@mgp.local',
    };
    return this.service.resolveIncident(organizationId, id, dto, user);
  }

  @Post('simulate-inspection')
  @ApiOperation({
    summary: 'Inspeciona uma amostra de tráfego contra as regras de detecção de IVT',
    description: 'Avalia Click Injection (<300ms), Click Flooding (>15/min), emuladores e tokens de viewability.',
  })
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização (Tenant)',
  })
  @ApiResponse({ status: 201, description: 'Resultado da inspeção retornado.' })
  async simulateInspection(
    @Body() dto: SimulateIvtInspectionDto,
    @Headers('x-organization-id') orgIdHeader?: string,
    @Req() req?: any,
  ) {
    const organizationId = req?.tenant?.organizationId || orgIdHeader;
    return this.service.inspectTraffic(organizationId, dto);
  }
}
