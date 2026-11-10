import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { TenantId } from '../../../common/decorators/tenant.decorator';
import { PlansService } from '../services/plans.service';
import { SubscribePlanDto } from '../dto/plans.dto';
import {
  PlanDetailsDto,
  CurrentPlanResponseDto,
  ChangePlanResponseDto,
  OrganizationSubscriptionDto,
} from '@mgp/contracts';

@ApiTags('Planos SaaS, Quotas & Assinaturas')
@Controller('api/v1/plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todos os planos SaaS disponíveis na plataforma MGP',
    description:
      'Retorna o catálogo de planos (Free, Starter, Pro, Business) com seus respectivos preços, limites e recursos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Catálogo de planos disponíveis.',
  })
  listPlans(): PlanDetailsDto[] {
    return this.plansService.listPlans();
  }

  @Get('current')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização ativa (Tenant)',
  })
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({
    summary: 'Consultar assinatura ativa e consumo atual de quotas da organização',
    description:
      'Retorna detalhes do plano contratado, datas do ciclo vigente e medição em tempo real de apps, keywords, chamadas de API e membros.',
  })
  @ApiResponse({
    status: 200,
    description: 'Assinatura e consumo de quotas do tenant.',
  })
  async getOrganizationPlan(
    @TenantId() organizationId: string,
  ): Promise<CurrentPlanResponseDto> {
    return this.plansService.getOrganizationPlan(organizationId);
  }

  @Post('subscribe')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização ativa (Tenant)',
  })
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({
    summary: 'Contratar ou alterar plano da organização (Upgrade / Downgrade)',
    description:
      'Atualiza o nível de serviço da organização, recalculando o período de vigência e aplicando as novas quotas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Plano ativado com sucesso.',
  })
  async subscribeOrChangePlan(
    @TenantId() organizationId: string,
    @Body() dto: SubscribePlanDto,
  ): Promise<ChangePlanResponseDto> {
    return this.plansService.subscribeOrChangePlan(organizationId, dto);
  }

  @Post('cancel')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-organization-id',
    required: true,
    description: 'UUID da organização ativa (Tenant)',
  })
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({
    summary: 'Cancelar renovação automática da assinatura',
    description:
      'Registra o cancelamento da assinatura. O acesso aos recursos do plano é mantido integralmente até a data de término do ciclo vigente.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cancelamento registrado com sucesso.',
  })
  async cancelSubscription(
    @TenantId() organizationId: string,
  ): Promise<OrganizationSubscriptionDto> {
    return this.plansService.cancelSubscription(organizationId);
  }
}

