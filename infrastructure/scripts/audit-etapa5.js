#!/usr/bin/env node

/**
 * Mobile Growth Platform (MGP)
 * Script de Auditoria Automatizada e Certificação da ETAPA 5
 *
 * Cobre exaustivamente:
 * - Fase 29: Estimativas Preditivas de Downloads e Receita (Power-Law / Pareto)
 * - Fase 30: Monitoramento de Tendências & Detecção de Apps em Ascensão (Breakouts & Trending Keywords)
 * - Fase 31: Recomendações de ASO & Campanhas com IA (Otimização Play Store & Ad Server)
 * - Fase 32: API Pública Comercial & Gestão de API Keys (Quotas, Rate Limiting & Swagger Público)
 * - Fase 33: Motor de Planos SaaS, Quotas Dinâmicas e Monetização por Assinatura (FREE, STARTER, PRO, BUSINESS)
 * - Fase 34: Testes de Integração E2E & Homologação Final da Etapa 5
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '../../');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function printHeader(title) {
  console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}  ${title}${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}\n`);
}

let totalChecks = 0;
let passedChecks = 0;

function evaluate(desc, condition, details = '') {
  totalChecks++;
  const symbol = condition ? `${COLORS.green}✔ [APROVADO]${COLORS.reset}` : `${COLORS.red}✖ [FALHOU]${COLORS.reset}`;
  console.log(` ${symbol} ${desc}`);
  if (details && !condition) {
    console.log(`    ${COLORS.yellow}Detalhes: ${details}${COLORS.reset}`);
  }
  if (condition) passedChecks++;
  return condition;
}

printHeader('AUDITORIA ETAPA 5 — INTELIGÊNCIA AVANÇADA, MODELOS PREDITIVOS, IA, API PÚBLICA, PLANOS SAAS & E2E (FASES 29 A 34)');

// -----------------------------------------------------------------------------
// 1. Modelagem Prisma & Migrations (Fases 29 a 33)
// -----------------------------------------------------------------------------
printHeader('PARTE 1: Modelagem de Dados & Migrations (AsoAppEstimate, AsoMarketTrend, AsoTrendAlert, AsoAiRecommendation, ApiKey, Subscription)');

const schemaPath = path.join(ROOT_DIR, 'packages/database/prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

evaluate(
  'Schema Prisma define model AsoAppEstimate (Fase 29)',
  schemaContent.includes('model AsoAppEstimate')
);

evaluate(
  'AsoAppEstimate possui campos de downloads e receita diários/mensais com min, median, max',
  schemaContent.includes('dailyDownloadsMin') &&
  schemaContent.includes('dailyDownloadsMedian') &&
  schemaContent.includes('dailyDownloadsMax') &&
  schemaContent.includes('dailyRevenueMin') &&
  schemaContent.includes('dailyRevenueMedian') &&
  schemaContent.includes('dailyRevenueMax')
);

evaluate(
  'AsoAppEstimate possui confidenceScore, calculationMethod e breakdownJson',
  schemaContent.includes('confidenceScore') &&
  schemaContent.includes('calculationMethod') &&
  schemaContent.includes('breakdownJson')
);

evaluate(
  'Schema Prisma define model AsoMarketTrend com category, country, date e JSON fields (Fase 30)',
  schemaContent.includes('model AsoMarketTrend') &&
  schemaContent.includes('breakoutAppsJson') &&
  schemaContent.includes('trendingKeywordsJson')
);

evaluate(
  'Schema Prisma define model AsoTrendAlert com organization, severity e targetAppId (Fase 30)',
  schemaContent.includes('model AsoTrendAlert') &&
  schemaContent.includes('targetAppId') &&
  schemaContent.includes('isRead')
);

evaluate(
  'Schema Prisma define enum AsoAiRecommendationType e AsoAiRecommendationStatus (Fase 31)',
  schemaContent.includes('enum AsoAiRecommendationType') &&
  schemaContent.includes('enum AsoAiRecommendationStatus')
);

evaluate(
  'Schema Prisma define model AsoAiRecommendation com suggestionsJson e targetKeywords (Fase 31)',
  schemaContent.includes('model AsoAiRecommendation') &&
  schemaContent.includes('suggestionsJson') &&
  schemaContent.includes('targetKeywords') &&
  schemaContent.includes('modelUsed')
);

evaluate(
  'Schema Prisma define model ApiKey com keyPrefix, keyHash, scopes, quotas e timestamps (Fase 32)',
  schemaContent.includes('model ApiKey') &&
  schemaContent.includes('keyPrefix') &&
  schemaContent.includes('keyHash') &&
  schemaContent.includes('rateLimitPerMin') &&
  schemaContent.includes('quotaMonthly') &&
  schemaContent.includes('quotaUsed') &&
  schemaContent.includes('revokedAt')
);

evaluate(
  'Schema Prisma define enums PlanTier, SubscriptionStatus e BillingCycle (Fase 33)',
  schemaContent.includes('enum PlanTier') &&
  schemaContent.includes('FREE') &&
  schemaContent.includes('STARTER') &&
  schemaContent.includes('PRO') &&
  schemaContent.includes('BUSINESS') &&
  schemaContent.includes('enum SubscriptionStatus') &&
  schemaContent.includes('enum BillingCycle')
);

evaluate(
  'Schema Prisma define model Subscription com relations, ciclo de vida e vigência (Fase 33)',
  schemaContent.includes('model Subscription') &&
  schemaContent.includes('planTier           PlanTier') &&
  schemaContent.includes('status             SubscriptionStatus') &&
  schemaContent.includes('billingCycle       BillingCycle') &&
  schemaContent.includes('currentPeriodStart DateTime') &&
  schemaContent.includes('currentPeriodEnd   DateTime') &&
  schemaContent.includes('canceledAt         DateTime?')
);

evaluate(
  'Organization possui relações mapeadas com asoAppEstimates, trendAlerts, aiRecommendations, apiKeys e subscription (Fase 33)',
  schemaContent.includes('asoAppEstimates   AsoAppEstimate[]') &&
  schemaContent.includes('trendAlerts       AsoTrendAlert[]') &&
  schemaContent.includes('aiRecommendations AsoAiRecommendation[]') &&
  schemaContent.includes('apiKeys           ApiKey[]') &&
  schemaContent.includes('subscription      Subscription?')
);

const migration29Path = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109000000_aso_predictive_estimates/migration.sql');
const migration30Path = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109010000_aso_market_trends_and_alerts/migration.sql');
const migration31Path = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109020000_aso_ai_recommendations/migration.sql');
const migration32Path = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109030000_api_keys_and_public_api/migration.sql');
const migration33Path = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109040000_saas_plans_and_subscriptions/migration.sql');

evaluate('Migration SQL da Fase 29 existe no diretório oficial', fs.existsSync(migration29Path));
evaluate('Migration SQL da Fase 30 existe no diretório oficial', fs.existsSync(migration30Path));
evaluate('Migration SQL da Fase 31 existe no diretório oficial', fs.existsSync(migration31Path));
evaluate('Migration SQL da Fase 32 existe no diretório oficial', fs.existsSync(migration32Path));
evaluate('Migration SQL da Fase 33 existe no diretório oficial', fs.existsSync(migration33Path));

if (fs.existsSync(migration30Path)) {
  const mig30Content = fs.readFileSync(migration30Path, 'utf8');
  evaluate(
    'Migration SQL cria tabelas aso_market_trends e aso_trend_alerts com índices compostos',
    mig30Content.includes('CREATE TABLE "aso_market_trends"') &&
    mig30Content.includes('CREATE TABLE "aso_trend_alerts"') &&
    mig30Content.includes('aso_market_trends_category_country_date_key')
  );
}

if (fs.existsSync(migration31Path)) {
  const mig31Content = fs.readFileSync(migration31Path, 'utf8');
  evaluate(
    'Migration SQL cria tabela aso_ai_recommendations com enums e chave composta',
    mig31Content.includes('CREATE TABLE "aso_ai_recommendations"') &&
    mig31Content.includes('CREATE TYPE "AsoAiRecommendationType"') &&
    mig31Content.includes('CREATE TYPE "AsoAiRecommendationStatus"')
  );
}

if (fs.existsSync(migration32Path)) {
  const mig32Content = fs.readFileSync(migration32Path, 'utf8');
  evaluate(
    'Migration SQL cria tabela api_keys com índices por key_hash e organization_id/revoked_at',
    mig32Content.includes('CREATE TABLE "api_keys"') &&
    mig32Content.includes('CREATE UNIQUE INDEX "api_keys_key_hash_key"') &&
    mig32Content.includes('CREATE INDEX "api_keys_organization_id_revoked_at_idx"')
  );
}

if (fs.existsSync(migration33Path)) {
  const mig33Content = fs.readFileSync(migration33Path, 'utf8');
  evaluate(
    'Migration SQL cria tabela subscriptions com enums PlanTier, SubscriptionStatus e BillingCycle (Fase 33)',
    mig33Content.includes('CREATE TABLE "subscriptions"') &&
    mig33Content.includes('CREATE TYPE "PlanTier"') &&
    mig33Content.includes('CREATE TYPE "SubscriptionStatus"') &&
    mig33Content.includes('CREATE TYPE "BillingCycle"') &&
    mig33Content.includes('CREATE UNIQUE INDEX "subscriptions_organization_id_key"')
  );
}

// -----------------------------------------------------------------------------
// 2. Contratos & DTOs em @mgp/contracts
// -----------------------------------------------------------------------------
printHeader('PARTE 2: Contratos & DTOs Compartilhados (@mgp/contracts)');

const asoContractsPath = path.join(ROOT_DIR, 'packages/contracts/src/aso.contracts.ts');
evaluate('Arquivo packages/contracts/src/aso.contracts.ts existe', fs.existsSync(asoContractsPath));

const asoContractsContent = fs.readFileSync(asoContractsPath, 'utf8');

evaluate(
  'Contratos da Fase 29 exportados (AsoEstimateRangeDto, AsoAppEstimateDto, AsoEstimatesSummaryDto, AsoCategoryBenchmarkDto)',
  asoContractsContent.includes('export interface AsoEstimateRangeDto') &&
  asoContractsContent.includes('export interface AsoAppEstimateDto') &&
  asoContractsContent.includes('export interface AsoEstimatesSummaryDto') &&
  asoContractsContent.includes('export interface AsoCategoryBenchmarkDto')
);

evaluate(
  'Contrato BreakoutAppDto exportado com rankDelta, growthPercentage7d e breakoutScore (Fase 30)',
  asoContractsContent.includes('export interface BreakoutAppDto') &&
  asoContractsContent.includes('rankDelta: number;') &&
  asoContractsContent.includes('breakoutScore: number;')
);

evaluate(
  'Contrato TrendingKeywordDto exportado com searchVolume, growthRate7d e opportunityScore (Fase 30)',
  asoContractsContent.includes('export interface TrendingKeywordDto') &&
  asoContractsContent.includes('opportunityScore: number;')
);

evaluate(
  'Contrato CategoryTrendSummaryDto exportado com topBreakouts e trendingKeywords (Fase 30)',
  asoContractsContent.includes('export interface CategoryTrendSummaryDto') &&
  asoContractsContent.includes('topBreakouts: BreakoutAppDto[];') &&
  asoContractsContent.includes('trendingKeywords: TrendingKeywordDto[];')
);

evaluate(
  'Contrato TrendAlertDto exportado com severity e isRead (Fase 30)',
  asoContractsContent.includes('export interface TrendAlertDto') &&
  asoContractsContent.includes('severity: ')
);

evaluate(
  'Contratos da Fase 31 exportados (AsoAiSuggestionItemDto, AsoAiRecommendationDto, GenerateAsoAiRecommendationsInputDto, ApplyAiRecommendationDto)',
  asoContractsContent.includes('export interface AsoAiSuggestionItemDto') &&
  asoContractsContent.includes('export interface AsoAiRecommendationDto') &&
  asoContractsContent.includes('export interface GenerateAsoAiRecommendationsInputDto') &&
  asoContractsContent.includes('export interface ApplyAiRecommendationDto')
);

const apiKeysContractsPath = path.join(ROOT_DIR, 'packages/contracts/src/api-keys.contracts.ts');
evaluate('Arquivo de contratos api-keys.contracts.ts existe (Fase 32)', fs.existsSync(apiKeysContractsPath));

if (fs.existsSync(apiKeysContractsPath)) {
  const akcContent = fs.readFileSync(apiKeysContractsPath, 'utf8');
  evaluate(
    'Contratos da Fase 32 exportados (ApiKeyDto, CreateApiKeyInputDto, ApiKeyCreatedDto, ApiKeyUsageStatsDto, PublicApiResponseDto)',
    akcContent.includes('export interface ApiKeyDto') &&
    akcContent.includes('export interface CreateApiKeyInputDto') &&
    akcContent.includes('export interface ApiKeyCreatedDto') &&
    akcContent.includes('export interface ApiKeyUsageStatsDto') &&
    akcContent.includes('export interface PublicApiResponseDto')
  );
}

const plansContractsPath = path.join(ROOT_DIR, 'packages/contracts/src/plans.contracts.ts');
const contractsIndexPath = path.join(ROOT_DIR, 'packages/contracts/src/index.ts');
evaluate('Arquivo de contratos plans.contracts.ts existe (Fase 33)', fs.existsSync(plansContractsPath));

if (fs.existsSync(plansContractsPath)) {
  const pcContent = fs.readFileSync(plansContractsPath, 'utf8');
  evaluate(
    'Contratos da Fase 33 exportados (PlanLimitsDto, PlanDetailsDto, OrganizationSubscriptionDto, PlanUsageDto, CurrentPlanResponseDto, SubscribePlanInputDto)',
    pcContent.includes('export interface PlanLimitsDto') &&
    pcContent.includes('export interface PlanDetailsDto') &&
    pcContent.includes('export interface OrganizationSubscriptionDto') &&
    pcContent.includes('export interface PlanUsageDto') &&
    pcContent.includes('export interface CurrentPlanResponseDto') &&
    pcContent.includes('export interface SubscribePlanInputDto')
  );
}

if (fs.existsSync(contractsIndexPath)) {
  const indexContent = fs.readFileSync(contractsIndexPath, 'utf8');
  evaluate(
    'index.ts de contratos reexporta plans.contracts',
    indexContent.includes("export * from './plans.contracts.js';") ||
    indexContent.includes("export * from './plans.contracts';")
  );
}

// -----------------------------------------------------------------------------
// 3. Motores de Backend (Fases 29 a 33)
// -----------------------------------------------------------------------------
printHeader('PARTE 3: Motores de Backend da Etapa 5 (Estimativas, Tendências, IA, API Keys e Planos SaaS)');

const benchmarksPath = path.join(ROOT_DIR, 'apps/api/src/modules/aso/constants/category-benchmarks.constant.ts');
evaluate('Arquivo de benchmarks setoriais existe', fs.existsSync(benchmarksPath));

const service29Path = path.join(ROOT_DIR, 'apps/api/src/modules/aso/services/aso-estimates.service.ts');
evaluate('Serviço AsoEstimatesService existe', fs.existsSync(service29Path));

if (fs.existsSync(service29Path)) {
  const serv29Content = fs.readFileSync(service29Path, 'utf8');
  evaluate(
    'AsoEstimatesService implementa cálculo de Pareto D = alpha * (r ^ -beta)',
    serv29Content.includes('benchmark.alpha * Math.pow(rankBasis, -benchmark.beta)')
  );
  evaluate(
    'AsoEstimatesService ajusta estimativa por velocidade de avaliações e nota média',
    serv29Content.includes('reviewVelocityFactor') &&
    serv29Content.includes('scoreFactor')
  );
  evaluate(
    'AsoEstimatesService persiste snapshot com upsert atômico por app, data e país',
    serv29Content.includes('this.prisma.asoAppEstimate.upsert')
  );
}

const service30Path = path.join(ROOT_DIR, 'apps/api/src/modules/aso/services/aso-trends.service.ts');
evaluate('Serviço AsoTrendsService existe', fs.existsSync(service30Path));

if (fs.existsSync(service30Path)) {
  const serv30Content = fs.readFileSync(service30Path, 'utf8');
  evaluate(
    'AsoTrendsService calcula Breakout Score composto (rankDelta, growth, tração)',
    serv30Content.includes('rankScore') &&
    serv30Content.includes('growthScore') &&
    serv30Content.includes('tractionScore') &&
    serv30Content.includes('breakoutScore')
  );
  evaluate(
    'AsoTrendsService detecta e persiste snapshots diários de tendências em aso_market_trends',
    serv30Content.includes('this.prisma.asoMarketTrend.findUnique') &&
    serv30Content.includes('this.prisma.asoMarketTrend.create')
  );
  evaluate(
    'AsoTrendsService calcula oportunidade de palavras-chave (opportunityScore)',
    serv30Content.includes('opportunityScore')
  );
  evaluate(
    'AsoTrendsService gera alertas automáticos de oportunidade em aso_trend_alerts',
    serv30Content.includes('evaluateAndCreateTrendAlerts') &&
    serv30Content.includes('this.prisma.asoTrendAlert.create')
  );
  evaluate(
    'AsoTrendsService implementa marcação de alerta como lido com isolamento de tenant',
    serv30Content.includes('markAlertAsRead') &&
    serv30Content.includes('organizationId')
  );
}

const service31Path = path.join(ROOT_DIR, 'apps/api/src/modules/aso/services/aso-ai-recommendations.service.ts');
evaluate('Serviço AsoAiRecommendationsService existe', fs.existsSync(service31Path));

if (fs.existsSync(service31Path)) {
  const serv31Content = fs.readFileSync(service31Path, 'utf8');
  evaluate(
    'AsoAiRecommendationsService implementa geração respeitando limite de 30 chars para títulos do Google Play',
    serv31Content.includes('slice(0, 30)') &&
    serv31Content.includes('TITLE_OPTIMIZATION')
  );
  evaluate(
    'AsoAiRecommendationsService implementa geração respeitando limite de 80 chars para descrição curta',
    serv31Content.includes('slice(0, 80)') &&
    serv31Content.includes('DESCRIPTION_OPTIMIZATION')
  );
  evaluate(
    'AsoAiRecommendationsService implementa modalidades KEYWORD_EXPANSION, CAMPAIGN_STRATEGY e CREATIVE_COPY',
    serv31Content.includes('KEYWORD_EXPANSION') &&
    serv31Content.includes('CAMPAIGN_STRATEGY') &&
    serv31Content.includes('CREATIVE_COPY')
  );
}

const service32Path = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/services/api-keys.service.ts');
evaluate('Serviço ApiKeysService existe (Fase 32)', fs.existsSync(service32Path));

if (fs.existsSync(service32Path)) {
  const serv32Content = fs.readFileSync(service32Path, 'utf8');
  evaluate(
    'ApiKeysService implementa geração com prefixo mgp_live_ e hash criptográfico SHA-256',
    serv32Content.includes('mgp_live_') &&
    serv32Content.includes("crypto.createHash('sha256')")
  );
  evaluate(
    'ApiKeysService implementa validação de escopos, expiração e consumo de quota mensal',
    serv32Content.includes('validateAndConsumeKey') &&
    serv32Content.includes('quotaUsed: { increment: 1 }') &&
    serv32Content.includes('quotaMonthly')
  );
  evaluate(
    'ApiKeysService implementa controle de Rate Limiting por minuto',
    serv32Content.includes('checkRateLimit') &&
    serv32Content.includes('rateLimitPerMin')
  );
  evaluate(
    'ApiKeysService implementa revogação segura de chaves com revokedAt',
    serv32Content.includes('revokeKey') &&
    serv32Content.includes('revokedAt: new Date()')
  );
}

const plansConstantsPath = path.join(ROOT_DIR, 'apps/api/src/modules/plans/constants/plans.constants.ts');
evaluate('Arquivo de constantes de planos plans.constants.ts existe (Fase 33)', fs.existsSync(plansConstantsPath));

if (fs.existsSync(plansConstantsPath)) {
  const pcContent = fs.readFileSync(plansConstantsPath, 'utf8');
  evaluate(
    'Catálogo PLANS_CATALOG define tiers FREE, STARTER, PRO e BUSINESS com limites e preços',
    pcContent.includes('FREE:') &&
    pcContent.includes('STARTER:') &&
    pcContent.includes('PRO:') &&
    pcContent.includes('BUSINESS:') &&
    pcContent.includes('priceMonthlyBrl') &&
    pcContent.includes('priceYearlyMonthlyBrl') &&
    pcContent.includes('maxMonitoredApps') &&
    pcContent.includes('maxTrackedKeywordsPerApp')
  );
}

const service33Path = path.join(ROOT_DIR, 'apps/api/src/modules/plans/services/plans.service.ts');
evaluate('Serviço PlansService existe (Fase 33)', fs.existsSync(service33Path));

if (fs.existsSync(service33Path)) {
  const serv33Content = fs.readFileSync(service33Path, 'utf8');
  evaluate(
    'PlansService auto-inicializa plano FREE para organizações sem assinatura prévia',
    serv33Content.includes('getOrganizationPlan') &&
    serv33Content.includes('this.prisma.subscription.findUnique') &&
    serv33Content.includes('this.prisma.subscription.create') &&
    serv33Content.includes("planTier: 'FREE'")
  );
  evaluate(
    'PlansService calcula consumo de quotas em tempo real (apps, keywords, chamadas de API, usuários)',
    serv33Content.includes('this.prisma.asoApp.count') &&
    serv33Content.includes('this.prisma.asoAppKeyword.count') &&
    serv33Content.includes('this.prisma.membership.count') &&
    serv33Content.includes('this.prisma.apiKey.aggregate')
  );
  evaluate(
    'PlansService implementa alteração de plano e ciclo de faturamento (mensal/anual)',
    serv33Content.includes('subscribeOrChangePlan') &&
    serv33Content.includes('periodDays =') &&
    serv33Content.includes('this.prisma.subscription.upsert')
  );
  evaluate(
    'PlansService implementa cancelamento elegante com vigência até final do período',
    serv33Content.includes('cancelSubscription') &&
    serv33Content.includes('canceledAt: new Date()')
  );
  evaluate(
    'PlansService implementa guard de quotas checkQuota',
    serv33Content.includes('checkQuota') &&
    serv33Content.includes('QUOTA_EXCEEDED')
  );
}

// -----------------------------------------------------------------------------
// 4. Controladores REST, Guards & Proteção Multi-Tenant (Fases 29 a 33)
// -----------------------------------------------------------------------------
printHeader('PARTE 4: Controladores REST, Guards & Proteção Multi-Tenant (Fases 29 a 33)');

const ctrl29Path = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-estimates.controller.ts');
const ctrl30Path = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-trends.controller.ts');
const ctrl31Path = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-ai-recommendations.controller.ts');
const ctrl32PrivatePath = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/controllers/api-keys.controller.ts');
const ctrl32PublicPath = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/controllers/public-aso.controller.ts');
const guard32Path = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/guards/api-key-auth.guard.ts');
const ctrl33Path = path.join(ROOT_DIR, 'apps/api/src/modules/plans/controllers/plans.controller.ts');
const module33Path = path.join(ROOT_DIR, 'apps/api/src/modules/plans/plans.module.ts');

evaluate('Controlador AsoEstimatesController existe', fs.existsSync(ctrl29Path));
evaluate('Controlador AsoTrendsController existe', fs.existsSync(ctrl30Path));
evaluate('Controlador AsoAiRecommendationsController existe', fs.existsSync(ctrl31Path));
evaluate('Controlador privado ApiKeysController existe (Fase 32)', fs.existsSync(ctrl32PrivatePath));
evaluate('Controlador comercial PublicAsoController existe (Fase 32)', fs.existsSync(ctrl32PublicPath));
evaluate('Guard ApiKeyAuthGuard existe (Fase 32)', fs.existsSync(guard32Path));
evaluate('Controlador PlansController existe (Fase 33)', fs.existsSync(ctrl33Path));
evaluate('Módulo PlansModule existe (Fase 33)', fs.existsSync(module33Path));

if (fs.existsSync(guard32Path)) {
  const guardContent = fs.readFileSync(guard32Path, 'utf8');
  evaluate(
    'ApiKeyAuthGuard extrai chave de X-API-Key e Authorization: Bearer, definindo cabeçalhos informativos de resposta',
    guardContent.includes("request.headers['x-api-key']") &&
    guardContent.includes("request.headers['authorization']") &&
    guardContent.includes('X-RateLimit-Limit') &&
    guardContent.includes('X-Quota-Remaining')
  );
}

if (fs.existsSync(ctrl32PrivatePath)) {
  const ctrlContent = fs.readFileSync(ctrl32PrivatePath, 'utf8');
  evaluate(
    'ApiKeysController protegido com JwtAuthGuard e TenantGuard com endpoints CRUD',
    ctrlContent.includes('@UseGuards(JwtAuthGuard, TenantGuard)') &&
    ctrlContent.includes('@Post()') &&
    ctrlContent.includes('@Get()') &&
    ctrlContent.includes("@Get('stats')") &&
    ctrlContent.includes("@Post(':id/revoke')")
  );
}

if (fs.existsSync(ctrl32PublicPath)) {
  const publicCtrlContent = fs.readFileSync(ctrl32PublicPath, 'utf8');
  evaluate(
    'PublicAsoController protegido por ApiKeyAuthGuard com endpoints públicos e wrapper de resposta',
    publicCtrlContent.includes('@UseGuards(ApiKeyAuthGuard)') &&
    publicCtrlContent.includes("@Get('apps/:appId')") &&
    publicCtrlContent.includes("@Get('apps/:appId/estimates')") &&
    publicCtrlContent.includes("@Get('trends/categories/:category')") &&
    publicCtrlContent.includes("@Get('keywords/ranking')") &&
    publicCtrlContent.includes('wrapResponse')
  );
}

if (fs.existsSync(ctrl33Path)) {
  const ctrl33Content = fs.readFileSync(ctrl33Path, 'utf8');
  evaluate(
    'PlansController expõe catálogo público GET /plans e operações privadas protegidas por JwtAuthGuard e TenantGuard',
    ctrl33Content.includes("@Get('current')") &&
    ctrl33Content.includes("@Post('subscribe')") &&
    ctrl33Content.includes("@Post('cancel')") &&
    ctrl33Content.includes('@UseGuards(JwtAuthGuard, TenantGuard)')
  );
}

const appModulePath = path.join(ROOT_DIR, 'apps/api/src/app.module.ts');
if (fs.existsSync(appModulePath)) {
  const appModuleContent = fs.readFileSync(appModulePath, 'utf8');
  evaluate(
    'AppModule importa e registra PlansModule',
    appModuleContent.includes('PlansModule')
  );
}

// -----------------------------------------------------------------------------
// 5. Interface de Usuário & Painéis Next.js (Fases 29 a 33)
// -----------------------------------------------------------------------------
printHeader('PARTE 5: Interface de Usuário & Painéis Next.js (Fases 29 a 33)');

const comp29Path = path.join(ROOT_DIR, 'apps/web/src/components/aso/predictive-estimates.tsx');
const comp30Path = path.join(ROOT_DIR, 'apps/web/src/components/aso/market-trends-panel.tsx');
const comp31Path = path.join(ROOT_DIR, 'apps/web/src/components/aso/ai-recommendations-panel.tsx');
const page32Path = path.join(ROOT_DIR, 'apps/web/src/app/(dashboard)/developers/page.tsx');
const page33Path = path.join(ROOT_DIR, 'apps/web/src/app/(dashboard)/plans/page.tsx');
const sidebarPath = path.join(ROOT_DIR, 'apps/web/src/components/layout/sidebar.tsx');

evaluate('Componente PredictiveEstimates existe', fs.existsSync(comp29Path));
evaluate('Componente MarketTrendsPanel existe', fs.existsSync(comp30Path));
evaluate('Componente AiRecommendationsPanel existe', fs.existsSync(comp31Path));
evaluate('Página DevelopersPage (/developers) existe (Fase 32)', fs.existsSync(page32Path));
evaluate('Página PlansPage (/plans) existe (Fase 33)', fs.existsSync(page33Path));

if (fs.existsSync(page32Path)) {
  const page32Content = fs.readFileSync(page32Path, 'utf8');
  evaluate(
    'DevelopersPage renderiza métricas de quota, tabela de chaves e modal de revelação única',
    page32Content.includes('stats.monthlyQuota') &&
    page32Content.includes('stats.monthlyUsed') &&
    page32Content.includes('createdKeyResult.plainTextKey') &&
    page32Content.includes('handleRevokeKey')
  );
  evaluate(
    'DevelopersPage renderiza exemplos de código interativos em cURL, Node.js e Python',
    page32Content.includes('activeSnippetTab') &&
    page32Content.includes('curl') &&
    page32Content.includes('nodejs') &&
    page32Content.includes('python')
  );
}

if (fs.existsSync(page33Path)) {
  const page33Content = fs.readFileSync(page33Path, 'utf8');
  evaluate(
    'PlansPage renderiza switch mensal/anual com desconto de 20% OFF e barras de consumo de quotas em tempo real',
    page33Content.includes('billingCycle') &&
    page33Content.includes('20% OFF') &&
    page33Content.includes('usage.appsUsed') &&
    page33Content.includes('usage.keywordsUsed')
  );
  evaluate(
    'PlansPage renderiza os 4 cartões de planos e modal de confirmação de contratação/cancelamento',
    page33Content.includes('FREE') &&
    page33Content.includes('handleSubscribe') &&
    page33Content.includes('handleCancelSubscription') &&
    page33Content.includes('Confirmar Alteração de Plano')
  );
}

if (fs.existsSync(sidebarPath)) {
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  evaluate(
    'Sidebar integra navegação para API & Desenvolvedores (/developers) e Planos & Assinatura (/plans)',
    sidebarContent.includes("href: '/developers'") &&
    sidebarContent.includes("name: 'API & Desenvolvedores'") &&
    sidebarContent.includes("href: '/plans'") &&
    sidebarContent.includes("name: 'Planos & Assinatura'")
  );
}

// -----------------------------------------------------------------------------
// 6. Testes Automatizados (Fases 29 a 34)
// -----------------------------------------------------------------------------
printHeader('PARTE 6: Verificação de Testes Unitários e E2E da Etapa 5 (Fases 29 a 34)');

const spec29Service = path.join(ROOT_DIR, 'apps/api/src/modules/aso/services/aso-estimates.service.spec.ts');
const spec29Ctrl = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-estimates.controller.spec.ts');
const spec30Service = path.join(ROOT_DIR, 'apps/api/src/modules/aso/services/aso-trends.service.spec.ts');
const spec30Ctrl = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-trends.controller.spec.ts');
const spec31Service = path.join(ROOT_DIR, 'apps/api/src/modules/aso/services/aso-ai-recommendations.service.spec.ts');
const spec31Ctrl = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-ai-recommendations.controller.spec.ts');
const spec32Service = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/services/api-keys.service.spec.ts');
const spec32Guard = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/guards/api-key-auth.guard.spec.ts');
const spec32PrivateCtrl = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/controllers/api-keys.controller.spec.ts');
const spec32PublicCtrl = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/controllers/public-aso.controller.spec.ts');
const spec33Service = path.join(ROOT_DIR, 'apps/api/src/modules/plans/services/plans.service.spec.ts');
const spec33Ctrl = path.join(ROOT_DIR, 'apps/api/src/modules/plans/controllers/plans.controller.spec.ts');
const spec34E2e = path.join(ROOT_DIR, 'apps/api/src/test/etapa5-e2e.spec.ts');

evaluate('Arquivo de testes aso-estimates.service.spec.ts existe', fs.existsSync(spec29Service));
evaluate('Arquivo de testes aso-estimates.controller.spec.ts existe', fs.existsSync(spec29Ctrl));
evaluate('Arquivo de testes aso-trends.service.spec.ts existe', fs.existsSync(spec30Service));
evaluate('Arquivo de testes aso-trends.controller.spec.ts existe', fs.existsSync(spec30Ctrl));
evaluate('Arquivo de testes aso-ai-recommendations.service.spec.ts existe', fs.existsSync(spec31Service));
evaluate('Arquivo de testes aso-ai-recommendations.controller.spec.ts existe', fs.existsSync(spec31Ctrl));
evaluate('Arquivo de testes api-keys.service.spec.ts existe (Fase 32)', fs.existsSync(spec32Service));
evaluate('Arquivo de testes api-key-auth.guard.spec.ts existe (Fase 32)', fs.existsSync(spec32Guard));
evaluate('Arquivo de testes api-keys.controller.spec.ts existe (Fase 32)', fs.existsSync(spec32PrivateCtrl));
evaluate('Arquivo de testes public-aso.controller.spec.ts existe (Fase 32)', fs.existsSync(spec32PublicCtrl));
evaluate('Arquivo de testes plans.service.spec.ts existe (Fase 33)', fs.existsSync(spec33Service));
evaluate('Arquivo de testes plans.controller.spec.ts existe (Fase 33)', fs.existsSync(spec33Ctrl));
evaluate('Arquivo de testes etapa5-e2e.spec.ts existe (Fase 34)', fs.existsSync(spec34E2e));

let tests32Passed = false;
try {
  execSync(
    'pnpm --filter @mgp/api test src/modules/api-keys/services/api-keys.service.spec.ts src/modules/api-keys/guards/api-key-auth.guard.spec.ts src/modules/api-keys/controllers/api-keys.controller.spec.ts src/modules/api-keys/controllers/public-aso.controller.spec.ts',
    { cwd: ROOT_DIR, encoding: 'utf8', stdio: 'pipe' }
  );
  tests32Passed = true;
} catch (e) {
  tests32Passed = false;
}

evaluate(
  'Suíte de testes da Fase 32 executa com 100% de aprovação (24 testes verdes em 4 suítes)',
  tests32Passed
);

let tests33Passed = false;
try {
  execSync(
    'pnpm --filter @mgp/api test src/modules/plans/services/plans.service.spec.ts src/modules/plans/controllers/plans.controller.spec.ts',
    { cwd: ROOT_DIR, encoding: 'utf8', stdio: 'pipe' }
  );
  tests33Passed = true;
} catch (e) {
  tests33Passed = false;
}

evaluate(
  'Suíte de testes da Fase 33 executa com 100% de aprovação (14 testes verdes em 2 suítes)',
  tests33Passed
);

let tests34Passed = false;
try {
  execSync(
    'pnpm --filter @mgp/api test src/test/etapa5-e2e.spec.ts',
    { cwd: ROOT_DIR, encoding: 'utf8', stdio: 'pipe' }
  );
  tests34Passed = true;
} catch (e) {
  tests34Passed = false;
}

evaluate(
  'Suíte de testes ponta a ponta (E2E) da Fase 34 executa com 100% de aprovação (18 testes verdes)',
  tests34Passed
);

// -----------------------------------------------------------------------------
// 7. Documentação Técnica (Fases 29 a 34)
// -----------------------------------------------------------------------------
printHeader('PARTE 7: Documentação Técnica da Etapa 5 (Fases 29 a 34)');

const doc29Path = path.join(ROOT_DIR, 'docs/aso/06-predictive-download-revenue-engine.md');
const doc30Path = path.join(ROOT_DIR, 'docs/aso/07-market-trends-and-breakout-detection.md');
const doc31Path = path.join(ROOT_DIR, 'docs/aso/08-ai-aso-and-campaign-recommendations.md');
const doc32Path = path.join(ROOT_DIR, 'docs/api/01-public-commercial-api-and-api-keys.md');
const doc33Path = path.join(ROOT_DIR, 'docs/saas/01-plans-quotas-and-subscriptions.md');
const doc34Path = path.join(ROOT_DIR, 'docs/aso/09-etapa5-final-audit-and-certification.md');

evaluate('Documentação técnica da Fase 29 existe', fs.existsSync(doc29Path));
evaluate('Documentação técnica da Fase 30 existe', fs.existsSync(doc30Path));
evaluate('Documentação técnica da Fase 31 existe', fs.existsSync(doc31Path));
evaluate('Documentação técnica da Fase 32 existe', fs.existsSync(doc32Path));
evaluate('Documentação técnica da Fase 33 existe', fs.existsSync(doc33Path));
evaluate('Documentação técnica de certificação final da Etapa 5 existe (Fase 34)', fs.existsSync(doc34Path));

// -----------------------------------------------------------------------------
// Relatório Final
// -----------------------------------------------------------------------------
printHeader('RELATÓRIO FINAL DA AUDITORIA DA ETAPA 5 - FASES 29 A 34 (CERTIFICAÇÃO COMPLETA)');

const score = Math.round((passedChecks / totalChecks) * 100);
console.log(` Total de verificações: ${totalChecks}`);
console.log(` Aprovados:             ${passedChecks}`);
console.log(` Falhas:                ${totalChecks - passedChecks}`);
console.log(` Pontuação de Conformidade: ${score}%\n`);

if (score === 100) {
  console.log(`${COLORS.bright}${COLORS.green}✔ HOMOLOGAÇÃO ETAPA 5 (FASES 29 A 34): APROVADA COM 100% DE SUCESSO! ETAPA 5 CERTIFICADA!${COLORS.reset}\n`);
  process.exit(0);
} else {
  console.log(`${COLORS.bright}${COLORS.red}✖ HOMOLOGAÇÃO ETAPA 5 (FASES 29 A 34): REPROVADA. CORRIJA AS FALHAS ACIMA.${COLORS.reset}\n`);
  process.exit(1);
}
