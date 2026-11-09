// ==============================================================================
// ETAPA 5 — FASE 32: API Pública Comercial & Gestão de API Keys
// ==============================================================================

export type ApiKeyScope =
  | 'aso:read'
  | 'estimates:read'
  | 'trends:read'
  | 'audit:read'
  | 'public:all';

export interface ApiKeyDto {
  id: string;
  organizationId: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitPerMin: number;
  quotaMonthly: number;
  quotaUsed: number;
  lastUsedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  isRevoked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyInputDto {
  name: string;
  scopes?: string[];
  expiresInDays?: number | null;
}

export interface ApiKeyCreatedDto {
  apiKey: ApiKeyDto;
  plainTextKey: string;
}

export interface RevokeApiKeyDto {
  id: string;
}

export interface ApiKeyUsageStatsDto {
  totalKeys: number;
  activeKeys: number;
  revokedKeys: number;
  monthlyQuota: number;
  monthlyUsed: number;
  remainingQuota: number;
}

export interface PublicApiResponseDto<T> {
  success: boolean;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
    quotaUsed: number;
    quotaRemaining: number;
  };
}
