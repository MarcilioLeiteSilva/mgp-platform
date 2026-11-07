import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  FraudIncidentStatus,
  FraudSeverity,
  IvtCategory,
  LedgerTransactionType,
  WalletAccountType,
} from '@mgp/shared';
import {
  FraudMetricsQueryDto,
  ListFraudIncidentsQueryDto,
  ResolveFraudIncidentDto,
  SimulateIvtInspectionDto,
} from './dto';

export interface IvtInspectionResult {
  isFraud: boolean;
  category?: IvtCategory;
  severity?: FraudSeverity;
  reason?: string;
  incidentId?: string;
  impactAmount?: number;
}

@Injectable()
export class AntifraudService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Avalia uma requisição ou evento publicitário contra as regras de detecção de tráfego inválido (IVT)
   */
  async inspectTraffic(
    organizationId: string,
    dto: SimulateIvtInspectionDto,
  ): Promise<IvtInspectionResult> {
    let isFraud = false;
    let category: IvtCategory = IvtCategory.GIVT_BOT;
    let severity: FraudSeverity = FraudSeverity.MEDIUM;
    let reason = 'Tráfego legítimo em conformidade com padrões MRC/IAB.';
    let impactAmount = 0.0;

    // Regra 1: Clique sem token de impressão/viewability
    if (dto.hasViewToken === false) {
      isFraud = true;
      category = IvtCategory.SIVT_VIEWABILITY_FRAUD;
      severity = FraudSeverity.CRITICAL;
      reason = 'Tentativa de clique sem token de impressão válido no leilão RTB (Zero Viewability).';
      impactAmount = 2.5;
    }
    // Regra 2: Fast Click / Click Injection (delta < 300ms entre impressão e clique)
    else if (dto.clickDeltaMs !== undefined && dto.clickDeltaMs < 300) {
      isFraud = true;
      category = IvtCategory.SIVT_CLICK_INJECTION;
      severity = dto.clickDeltaMs < 100 ? FraudSeverity.CRITICAL : FraudSeverity.HIGH;
      reason = `Clique com latência desumana (${dto.clickDeltaMs}ms após impressão). Provável injeção de clique.`;
      impactAmount = 1.8;
    }
    // Regra 3: Click Flooding (> 15 cliques/minuto do mesmo IP ou dispositivo)
    else if (dto.clicksPerMinute !== undefined && dto.clicksPerMinute > 15) {
      isFraud = true;
      category = IvtCategory.SIVT_CLICK_SPAM;
      severity = FraudSeverity.CRITICAL;
      reason = `Rajada de cliques anômala detectada (${dto.clicksPerMinute} cliques/min). Padrão de click spamming.`;
      impactAmount = 4.0;
    }
    // Regra 4: Ambiente Emulado (QEMU, BlueStacks, Nox, etc.)
    else if (dto.isEmulator === true) {
      isFraud = true;
      category = IvtCategory.GIVT_EMULATOR;
      severity = FraudSeverity.HIGH;
      reason = 'Dispositivo operando em emulador ou farm de dispositivos automatizada.';
      impactAmount = 1.5;
    }
    // Regra 5: Dispositivo Rooted / Jailbroken
    else if (dto.isRooted === true) {
      isFraud = true;
      category = IvtCategory.GIVT_BOT;
      severity = FraudSeverity.MEDIUM;
      reason = 'Dispositivo com privilégios de root violando integridade do sandbox do SDK.';
      impactAmount = 0.75;
    }

    if (!isFraud) {
      return { isFraud: false, reason };
    }

    // Persistência compulsória do incidente de fraude
    const incident = await this.prisma.fraudIncident.create({
      data: {
        organizationId,
        appId: dto.appId,
        campaignId: dto.campaignId,
        category,
        severity,
        status: FraudIncidentStatus.DETECTED,
        sourceIp: dto.sourceIp || '127.0.0.1',
        deviceFingerprint: dto.userAgent ? `fp_${Buffer.from(dto.userAgent).toString('base64').slice(0, 16)}` : undefined,
        evidencePayload: {
          clickDeltaMs: dto.clickDeltaMs,
          clicksPerMinute: dto.clicksPerMinute,
          isEmulator: dto.isEmulator,
          isRooted: dto.isRooted,
          userAgent: dto.userAgent,
          hasViewToken: dto.hasViewToken,
          detectedAt: new Date().toISOString(),
        },
        impactAmount,
        actionTaken: 'BLOCKED_BY_GATEKEEPER',
      },
    });

    return {
      isFraud: true,
      category,
      severity,
      reason,
      incidentId: incident.id,
      impactAmount,
    };
  }

  /**
   * Consolida métricas executivas de IVT, taxas de invalidação e volume financeiro protegido
   */
  async getMetrics(organizationId: string, query: FraudMetricsQueryDto) {
    const { period = '7d', appId } = query;

    const days = period === '24h' ? 1 : period === '30d' ? 30 : 7;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: any = {
      organizationId,
      createdAt: { gte: sinceDate },
    };

    if (appId) {
      where.appId = appId;
    }

    const [incidents, telemetryCount] = await Promise.all([
      this.prisma.fraudIncident.findMany({
        where,
        select: {
          id: true,
          category: true,
          severity: true,
          status: true,
          impactAmount: true,
        },
      }),
      this.prisma.telemetryEventRecord.count({
        where: {
          organizationId,
          createdAt: { gte: sinceDate },
          ...(appId ? { appId } : {}),
        },
      }),
    ]);

    const totalIncidents = incidents.length;
    // Base de eventos analisados (telemetria real ou amostragem proporcional)
    const totalEventsAnalyzed = Math.max(telemetryCount, totalIncidents * 42, 100);

    const ivtRatePct = Number(((totalIncidents / totalEventsAnalyzed) * 100).toFixed(2));

    const totalBlockedAmount = incidents.reduce(
      (acc, inc) => acc + Number(inc.impactAmount || 0),
      0,
    );

    let givtCount = 0;
    let sivtCount = 0;
    const severityCount = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    };
    const vectorMap: Record<string, number> = {};

    for (const inc of incidents) {
      if (inc.category.startsWith('GIVT')) {
        givtCount++;
      } else {
        sivtCount++;
      }

      if (severityCount[inc.severity] !== undefined) {
        severityCount[inc.severity]++;
      }

      vectorMap[inc.category] = (vectorMap[inc.category] || 0) + 1;
    }

    const topVectors = Object.entries(vectorMap)
      .map(([category, count]) => ({
        category,
        count,
        percentage: Number(((count / (totalIncidents || 1)) * 100).toFixed(1)),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      period,
      totalEventsAnalyzed,
      totalIncidents,
      ivtRatePct,
      totalBlockedAmount: Number(totalBlockedAmount.toFixed(2)),
      breakdown: {
        givtCount,
        sivtCount,
        givtPercentage: Number(((givtCount / (totalIncidents || 1)) * 100).toFixed(1)),
        sivtPercentage: Number(((sivtCount / (totalIncidents || 1)) * 100).toFixed(1)),
      },
      severity: severityCount,
      topVectors,
    };
  }

  /**
   * Lista incidentes de fraude com paginação e filtros estritamente vinculados ao tenant
   */
  async listIncidents(organizationId: string, query: ListFraudIncidentsQueryDto) {
    const { appId, campaignId, category, severity, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (appId) where.appId = appId;
    if (campaignId) where.campaignId = campaignId;
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.fraudIncident.findMany({
        where,
        include: {
          app: {
            select: { id: true, name: true, packageName: true },
          },
          campaign: {
            select: { id: true, name: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.fraudIncident.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Consulta os detalhes de um incidente específico
   */
  async getIncidentById(organizationId: string, id: string) {
    const incident = await this.prisma.fraudIncident.findFirst({
      where: { id, organizationId },
      include: {
        app: {
          select: { id: true, name: true, packageName: true, status: true },
        },
        campaign: {
          select: { id: true, name: true, bidAmount: true, billingModel: true },
        },
      },
    });

    if (!incident) {
      throw new NotFoundException('Incidente de fraude não encontrado para esta organização.');
    }

    return incident;
  }

  /**
   * Resolve um incidente com ação de moderação e suporte a estorno financeiro (Fraud Chargeback)
   */
  async resolveIncident(
    organizationId: string,
    id: string,
    dto: ResolveFraudIncidentDto,
    user: { id: string; email: string },
  ) {
    const incident = await this.prisma.fraudIncident.findFirst({
      where: { id, organizationId },
      include: {
        campaign: true,
      },
    });

    if (!incident) {
      throw new NotFoundException('Incidente de fraude não encontrado para esta organização.');
    }

    const impactAmount = Number(incident.impactAmount) || 0;

    // Execução atômica via $transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Atualiza o incidente de fraude
      const updatedIncident = await tx.fraudIncident.update({
        where: { id: incident.id },
        data: {
          status: dto.status as FraudIncidentStatus,
          actionTaken: dto.actionTaken,
          resolvedAt: new Date(),
          resolvedBy: user.id,
        },
      });

      let chargebackTransaction = null;

      // 2. Executa estorno financeiro no WalletLedger se solicitado e houver montante a estornar
      if (dto.executeChargeback && impactAmount > 0 && dto.status === 'CONFIRMED') {
        // Encontra a carteira do tenant
        const wallet = await tx.wallet.findUnique({
          where: { organizationId },
          include: { accounts: true },
        });

        if (wallet) {
          // Reembolsa a conta ADVERTISING_CREDITS da organização
          const advAccount = wallet.accounts.find(
            (a) => a.type === WalletAccountType.ADVERTISING_CREDITS,
          );

          if (advAccount) {
            const currentBalance = Number(advAccount.cachedBalance);
            const newBalance = Number((currentBalance + impactAmount).toFixed(4));

            await tx.walletAccount.update({
              where: { id: advAccount.id },
              data: { cachedBalance: newBalance },
            });

            chargebackTransaction = await tx.walletLedger.create({
              data: {
                accountId: advAccount.id,
                transactionType: LedgerTransactionType.FRAUD_CHARGEBACK,
                amount: impactAmount,
                balanceAfter: newBalance,
                idempotencyKey: `chargeback_${incident.id}`,
                description: `Estorno de segurança decorrente de incidente IVT (${incident.category})`,
                metadata: {
                  incidentId: incident.id,
                  category: incident.category,
                  severity: incident.severity,
                  resolvedBy: user.email,
                },
              },
            });
          }
        }
      }

      // 3. Trilha de auditoria compulsória
      await tx.auditLog.create({
        data: {
          organizationId,
          userId: user.id,
          action: 'FRAUD_INCIDENT_RESOLVED',
          entityType: 'FraudIncident',
          entityId: incident.id,
          diffBefore: {
            status: incident.status,
            actionTaken: incident.actionTaken,
          },
          diffAfter: {
            status: dto.status,
            actionTaken: dto.actionTaken,
            chargebackExecuted: dto.executeChargeback,
            impactAmount,
          },
        },
      });

      return {
        incident: updatedIncident,
        chargebackTransaction,
      };
    });

    return result;
  }
}
