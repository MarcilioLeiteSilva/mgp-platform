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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { AsoAiRecommendationsService } from '../services/aso-ai-recommendations.service';
import {
  GenerateAsoAiRecommendationsDto,
  ListAiRecommendationsQueryDto,
  ApplyAiRecommendationBodyDto,
} from '../dto/aso-ai-recommendations.dto';
import { AsoAiRecommendationDto } from '@mgp/contracts';

@ApiTags('ASO — Recomendações e Otimização com Inteligência Artificial')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-organization-id',
  required: true,
  description: 'UUID da organização ativa (Tenant)',
})
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('api/v1/aso')
export class AsoAiRecommendationsController {
  constructor(private readonly aiService: AsoAiRecommendationsService) {}

  @Post('apps/:id/ai/recommendations/generate')
  @ApiOperation({
    summary: 'Gerar recomendações de otimização ASO e campanhas com IA',
    description:
      'Gera sugestões preditivas e heurísticas para títulos (máx 30 chars), descrição curta (máx 80 chars), expansão semântica de palavras-chave, estratégia de lances e copywriting publicitário.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do aplicativo cadastrado na plataforma MGP',
  })
  @ApiResponse({
    status: 201,
    description: 'Recomendação gerada com sucesso e armazenada.',
  })
  async generateRecommendations(
    @Param('id') asoAppId: string,
    @TenantId() organizationId: string,
    @Body() dto: GenerateAsoAiRecommendationsDto,
  ): Promise<AsoAiRecommendationDto> {
    return this.aiService.generateRecommendations(asoAppId, organizationId, dto);
  }

  @Get('apps/:id/ai/recommendations')
  @ApiOperation({
    summary: 'Listar histórico de recomendações geradas por IA para um app',
    description:
      'Retorna histórico de sugestões ativas, aplicadas e descartadas para o aplicativo especificado.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID do aplicativo cadastrado na plataforma MGP',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de recomendações de IA.',
  })
  async listRecommendations(
    @Param('id') asoAppId: string,
    @TenantId() organizationId: string,
    @Query() query: ListAiRecommendationsQueryDto,
  ): Promise<AsoAiRecommendationDto[]> {
    return this.aiService.listRecommendations(asoAppId, organizationId, query);
  }

  @Post('ai/recommendations/:id/apply')
  @ApiOperation({
    summary: 'Aplicar uma sugestão de IA no aplicativo ou campanha',
    description:
      'Aplica a sugestão selecionada (atualizando título do app se aplicável) e marca o registro como APPLIED.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da recomendação de IA',
  })
  @ApiResponse({
    status: 200,
    description: 'Sugestão aplicada com sucesso.',
  })
  async applyRecommendation(
    @Param('id') recommendationId: string,
    @TenantId() organizationId: string,
    @Body() dto: ApplyAiRecommendationBodyDto,
  ): Promise<AsoAiRecommendationDto> {
    return this.aiService.applyRecommendation(recommendationId, organizationId, dto);
  }

  @Post('ai/recommendations/:id/dismiss')
  @ApiOperation({
    summary: 'Descartar uma recomendação gerada por IA',
    description: 'Marca a recomendação como DISMISSED para retirá-la da visão ativa.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da recomendação de IA',
  })
  @ApiResponse({
    status: 200,
    description: 'Recomendação descartada com sucesso.',
  })
  async dismissRecommendation(
    @Param('id') recommendationId: string,
    @TenantId() organizationId: string,
  ): Promise<AsoAiRecommendationDto> {
    return this.aiService.dismissRecommendation(recommendationId, organizationId);
  }
}
