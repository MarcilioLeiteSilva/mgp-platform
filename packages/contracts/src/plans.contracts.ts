// ==============================================================================
// ETAPA 5 — FASE 33: Motor de Planos SaaS, Quotas Dinâmicas e Assinaturas
// ==============================================================================

export type PlanTier = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS';

export type SubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING';

export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface PlanLimitsDto {
  maxMonitoredApps: number;
  maxTrackedKeywordsPerApp: number;
  monthlyApiQuota: number;
  rateLimitPerMin: number;
  maxMembers: number;
  hasAiGrowthCopilot: boolean;
  hasSmartBidding: boolean;
  hasRawDataExport: boolean;
  hasDedicatedSupport: boolean;
}

export interface PlanDetailsDto {
  tier: PlanTier;
  name: string;
  description: string;
  priceMonthlyBrl: number;
  priceYearlyMonthlyBrl: number;
  priceYearlyTotalBrl: number;
  features: string[];
  limits: PlanLimitsDto;
  isPopular?: boolean;
}

export interface OrganizationSubscriptionDto {
  id: string;
  organizationId: string;
  planTier: PlanTier;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  priceMonthly: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  canceledAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanUsageDto {
  appsUsed: number;
  appsLimit: number;
  keywordsUsed: number;
  keywordsLimit: number;
  apiCallsUsed: number;
  apiCallsLimit: number;
  membersUsed: number;
  membersLimit: number;
}

export interface CurrentPlanResponseDto {
  subscription: OrganizationSubscriptionDto;
  plan: PlanDetailsDto;
  usage: PlanUsageDto;
}

export interface SubscribePlanInputDto {
  planTier: PlanTier;
  billingCycle?: BillingCycle;
}

export interface ChangePlanResponseDto {
  success: boolean;
  message: string;
  subscription: OrganizationSubscriptionDto;
}

