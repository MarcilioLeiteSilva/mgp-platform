import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { ApiKeysService } from '../services/api-keys.service';
import { CreateApiKeyDto } from '../dto/api-keys.dto';
import {
  ApiKeyDto,
  ApiKeyCreatedDto,
  ApiKeyUsageStatsDto,
} from '@mgp/contracts';

@ApiTags('Gestão de Chaves de API Comercial')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-organization-id',
  required: true,
  description: 'UUID da organização ativa (Tenant)',
})
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('api/v1/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar nova chave de API comercial',
    description:
      'Gera uma chave secreta exclusiva (mgp_live_...). A chave completa em texto puro é retornada apenas uma vez na resposta.',
  })
  @ApiResponse({
    status: 201,
    description: 'Chave criada com sucesso.',
  })
  async createApiKey(
    @TenantId() organizationId: string,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedDto> {
    return this.apiKeysService.createApiKey(organizationId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar chaves de API da organização',
    description: 'Retorna a lista de chaves de API ativas e revogadas da organização.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de chaves de API.',
  })
  async listKeys(@TenantId() organizationId: string): Promise<ApiKeyDto[]> {
    return this.apiKeysService.listKeys(organizationId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Obter resumo de quotas e consumo de API',
    description: 'Retorna métricas consolidadas de consumo mensal e limites da organização.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas de consumo de API.',
  })
  async getStats(@TenantId() organizationId: string): Promise<ApiKeyUsageStatsDto> {
    return this.apiKeysService.getStats(organizationId);
  }

  @Post(':id/revoke')
  @ApiOperation({
    summary: 'Revogar uma chave de API',
    description: 'Invalida imediatamente a chave informada para novas requisições na API pública.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID da chave de API a ser revogada',
  })
  @ApiResponse({
    status: 200,
    description: 'Chave revogada com sucesso.',
  })
  async revokeKey(
    @Param('id') id: string,
    @TenantId() organizationId: string,
  ): Promise<ApiKeyDto> {
    return this.apiKeysService.revokeKey(id, organizationId);
  }
}
