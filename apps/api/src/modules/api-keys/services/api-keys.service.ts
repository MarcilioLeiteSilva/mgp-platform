import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import {
  ApiKeyDto,
  ApiKeyCreatedDto,
  ApiKeyUsageStatsDto,
} from '@mgp/contracts';
import { CreateApiKeyDto } from '../dto/api-keys.dto';

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);
  private readonly rateLimits = new Map<string, RateLimitTracker>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria uma nova chave de API comercial para a organização.
   */
  async createApiKey(organizationId: string, dto: CreateApiKeyDto): Promise<ApiKeyCreatedDto> {
    const rawSecret = crypto.randomBytes(24).toString('hex');
    const plainTextKey = `mgp_live_${rawSecret}`;
    const keyPrefix = `mgp_live_${rawSecret.slice(0, 8)}`;
    const keyHash = this.hashKey(plainTextKey);

    const expiresAt = dto.expiresInDays
      ? new Date(Date.now() + dto.expiresInDays * 86400000)
      : null;

    const scopes = dto.scopes && dto.scopes.length > 0
      ? dto.scopes
      : ['aso:read', 'estimates:read', 'trends:read'];

    const created = await this.prisma.apiKey.create({
      data: {
        organizationId,
        name: dto.name,
        keyPrefix,
        keyHash,
        scopes,
        rateLimitPerMin: 60,
        quotaMonthly: 10000,
        quotaUsed: 0,
        expiresAt,
      },
    });

    this.logger.log(`Chave de API "${created.name}" (${keyPrefix}) criada para org ${organizationId}`);

    return {
      apiKey: this.mapToDto(created),
      plainTextKey,
    };
  }

  /**
   * Lista as chaves de API da organização.
   */
  async listKeys(organizationId: string): Promise<ApiKeyDto[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => this.mapToDto(k));
  }

  /**
   * Revoga uma chave de API comercial.
   */
  async revokeKey(id: string, organizationId: string): Promise<ApiKeyDto> {
    const key = await this.prisma.apiKey.findFirst({
      where: { id, organizationId },
    });

    if (!key) {
      throw new NotFoundException(`Chave de API com ID "${id}" não encontrada.`);
    }

    if (key.revokedAt) {
      return this.mapToDto(key);
    }

    const updated = await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });

    this.logger.warn(`Chave de API "${key.name}" (${key.keyPrefix}) foi revogada.`);

    return this.mapToDto(updated);
  }

  /**
   * Retorna estatísticas agregadas de chaves e quotas da organização.
   */
  async getStats(organizationId: string): Promise<ApiKeyUsageStatsDto> {
    const keys = await this.prisma.apiKey.findMany({
      where: { organizationId },
    });

    const totalKeys = keys.length;
    const activeKeys = keys.filter((k) => !k.revokedAt && (!k.expiresAt || k.expiresAt > new Date())).length;
    const revokedKeys = keys.filter((k) => !!k.revokedAt).length;

    const monthlyQuota = keys.reduce((sum, k) => sum + k.quotaMonthly, 0);
    const monthlyUsed = keys.reduce((sum, k) => sum + k.quotaUsed, 0);
    const remainingQuota = Math.max(0, monthlyQuota - monthlyUsed);

    return {
      totalKeys,
      activeKeys,
      revokedKeys,
      monthlyQuota,
      monthlyUsed,
      remainingQuota,
    };
  }

  /**
   * Valida a chave de API enviada por clientes externos, checa expiração, escopos, rate limit e consome quota.
   */
  async validateAndConsumeKey(
    plainTextKey: string,
    requiredScope?: string,
  ): Promise<{
    organizationId: string;
    keyId: string;
    scopes: string[];
    quotaUsed: number;
    quotaRemaining: number;
  }> {
    if (!plainTextKey || !plainTextKey.startsWith('mgp_live_')) {
      throw new UnauthorizedException('Chave de API ausente ou inválida. Esperado formato "mgp_live_...".');
    }

    const keyHash = this.hashKey(plainTextKey);

    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash },
    });

    if (!key || key.revokedAt) {
      throw new UnauthorizedException('Chave de API inválida ou revogada.');
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      throw new UnauthorizedException('Chave de API expirada.');
    }

    // Validação de Escopo
    if (requiredScope) {
      const hasScope = key.scopes.includes(requiredScope) || key.scopes.includes('public:all');
      if (!hasScope) {
        throw new ForbiddenException(
          `A chave de API não possui permissão para o escopo "${requiredScope}".`,
        );
      }
    }

    // Rate Limiting em janela deslizante de 1 minuto
    this.checkRateLimit(key.id, key.rateLimitPerMin);

    // Verificação de Quota Mensal
    if (key.quotaUsed >= key.quotaMonthly) {
      throw new HttpException(
        `Quota mensal de requisições excedida (${key.quotaUsed}/${key.quotaMonthly}). Atualize o seu plano para continuar.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Incrementa contagem de uso e atualiza último acesso
    const updated = await this.prisma.apiKey.update({
      where: { id: key.id },
      data: {
        quotaUsed: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });

    const quotaRemaining = Math.max(0, updated.quotaMonthly - updated.quotaUsed);

    return {
      organizationId: updated.organizationId,
      keyId: updated.id,
      scopes: updated.scopes,
      quotaUsed: updated.quotaUsed,
      quotaRemaining,
    };
  }

  /**
   * Utilitário para gerar hash criptográfico seguro SHA-256 da chave secreta.
   */
  hashKey(plainTextKey: string): string {
    return crypto.createHash('sha256').update(plainTextKey).digest('hex');
  }

  /**
   * Controle de Rate Limiting por minuto em memória.
   */
  private checkRateLimit(keyId: string, limitPerMin: number): void {
    const now = Date.now();
    const tracker = this.rateLimits.get(keyId);

    if (!tracker || tracker.resetAt <= now) {
      this.rateLimits.set(keyId, {
        count: 1,
        resetAt: now + 60000,
      });
      return;
    }

    if (tracker.count >= limitPerMin) {
      const retryAfterSec = Math.ceil((tracker.resetAt - now) / 1000);
      throw new HttpException(
        `Limite de taxa de ${limitPerMin} requisições por minuto excedido. Tente novamente em ${retryAfterSec} segundos.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    tracker.count++;
  }

  private mapToDto(key: any): ApiKeyDto {
    return {
      id: key.id,
      organizationId: key.organizationId,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes || [],
      rateLimitPerMin: key.rateLimitPerMin,
      quotaMonthly: key.quotaMonthly,
      quotaUsed: key.quotaUsed,
      lastUsedAt: key.lastUsedAt instanceof Date ? key.lastUsedAt.toISOString() : key.lastUsedAt,
      expiresAt: key.expiresAt instanceof Date ? key.expiresAt.toISOString() : key.expiresAt,
      revokedAt: key.revokedAt instanceof Date ? key.revokedAt.toISOString() : key.revokedAt,
      isRevoked: !!key.revokedAt,
      createdAt: key.createdAt instanceof Date ? key.createdAt.toISOString() : key.createdAt,
      updatedAt: key.updatedAt instanceof Date ? key.updatedAt.toISOString() : key.updatedAt,
    };
  }
}
