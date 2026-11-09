import {
  Controller,
  Get,
  Post,
  Body,
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
import { AsoEstimatesService } from '../services/aso-estimates.service';
import { AsoEstimateQueryDto, RecalculateAsoEstimateDto } from '../dto/aso-estimates.dto';
import {
  AsoEstimatesSummaryDto,
  AsoAppEstimateDto,
  AsoCategoryBenchmarkDto,
} from '@mgp/contracts';

@ApiTags('ASO â€” Estimativas Preditivas de Mercado')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-organization-id',
  required: true,
  description: 'UUID da organizaÃ§Ã£o ativa (Tenant)',
})
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('api/v1/aso')
export class AsoEstimatesController {
  constructor(private readonly estimatesService: AsoEstimatesService) {}

  @Get('apps/:id/estimates')
  @ApiOperation({
    summary: 'Obter resumo de estimativas preditivas de downloads e receita',
    description:
      'Retorna a estimativa mais recente, sÃ©rie temporal histÃ³rica dos Ãºltimos 30 dias e taxas de crescimento com modelagem de Pareto/Power-Law.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do aplicativo monitorado na plataforma MGP',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo estatÃ­stico de downloads e receita com bandas de confianÃ§a.',
  })
  async getAppEstimates(
    @Param('id') asoAppId: string,
    @TenantId() organizationId: string,
    @Query() query: AsoEstimateQueryDto,
  ): Promise<AsoEstimatesSummaryDto> {
    return this.estimatesService.getEstimatesSummary(asoAppId, organizationId, query);
  }

  @Post('apps/:id/estimates/recalculate')
  @ApiOperation({
    summary: 'ForÃ§ar recÃ¡lculo sob demanda da estimativa preditiva',
    description:
      'Reavalia a posiÃ§Ã£o de ranking, mÃ©tricas de avaliaÃ§Ãµes e gera um novo snapshot atualizado para a data de hoje.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do aplicativo monitorado na plataforma MGP',
  })
  @ApiResponse({
    status: 201,
    description: 'Nova estimativa gerada e persistida com sucesso.',
  })
  async recalculateAppEstimate(
    @Param('id') asoAppId: string,
    @TenantId() organizationId: string,
    @Body() dto: RecalculateAsoEstimateDto,
  ): Promise<AsoAppEstimateDto> {
    return this.estimatesService.calculateAndSaveEstimate(asoAppId, organizationId, dto);
  }

  @Get('benchmarks')
  @ApiOperation({
    summary: 'Consultar benchmarks setoriais de downloads e ARPU por categoria',
    description:
      'Retorna coeficientes matemÃ¡ticos (alpha, beta, ARPU) calibrados para a Play Store no paÃ­s consultado.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Categoria do app (ex: GAME, FINANCE, SHOPPING, PRODUCTIVITY)',
  })
  @ApiQuery({
    name: 'country',
    required: false,
    description: 'CÃ³digo do paÃ­s (padrÃ£o: BR)',
  })
  @ApiResponse({
    status: 200,
    description: 'Curva e parÃ¢metros de referÃªncia da categoria.',
  })
  async getCategoryBenchmarks(
    @Query('category') category?: string,
    @Query('country') country?: string,
  ): Promise<AsoCategoryBenchmarkDto> {
    return this.estimatesService.getCategoryBenchmarks(category, country || 'BR');
  }
}

