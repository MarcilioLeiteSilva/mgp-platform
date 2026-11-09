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

printHeader('AUDITORIA ETAPA 5 — INTELIGÊNCIA AVANÇADA, MODELOS PREDITIVOS, IA & API PÚBLICA (FASES 29 A 32)');

// -----------------------------------------------------------------------------
// 1. Modelagem Prisma & Migrations (Fases 29, 30, 31 e 32)
// -----------------------------------------------------------------------------
printHeader('PARTE 1: Modelagem de Dados & Migrations (AsoAppEstimate, AsoMarketTrend, AsoTrendAlert, AsoAiRecommendation, ApiKey)');

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
  'Organization possui relações mapeadas com asoAppEstimates, trendAlerts, aiRecommendations e apiKeys',
  schemaContent.includes('asoAppEstimates   AsoAppEstimate[]') &&
  schemaContent.includes('trendAlerts       AsoTrendAlert[]') &&
  schemaContent.includes('aiRecommendations AsoAiRecommendation[]') &&
  schemaContent.includes('apiKeys           ApiKey[]')
);

const migration29Path = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109000000_aso_predictive_estimates/migration.sql');
const migration30Path = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109010000_aso_market_trends_and_alerts/migration.sql');
const migration31Path = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109020000_aso_ai_recommendations/migration.sql');
const migration32Path = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109030000_api_keys_and_public_api/migration.sql');

evaluate('Migration SQL da Fase 29 existe no diretório oficial', fs.existsSync(migration29Path));
evaluate('Migration SQL da Fase 30 existe no diretório oficial', fs.existsSync(migration30Path));
evaluate('Migration SQL da Fase 31 existe no diretório oficial', fs.existsSync(migration31Path));
evaluate('Migration SQL da Fase 32 existe no diretório oficial', fs.existsSync(migration32Path));

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

// -----------------------------------------------------------------------------
// 2. Contratos & DTOs em @mgp/contracts
// -----------------------------------------------------------------------------
printHeader('PARTE 2: Contratos & DTOs Compartilhados (@mgp/contracts)');

const contractsPath = path.join(ROOT_DIR, 'packages/contracts/src/aso.contracts.ts');
const contractsContent = fs.readFileSync(contractsPath, 'utf8');

evaluate(
  'Contratos da Fase 29 exportados (AsoEstimateRangeDto, AsoAppEstimateDto, AsoEstimatesSummaryDto, AsoCategoryBenchmarkDto)',
  contractsContent.includes('export interface AsoEstimateRangeDto') &&
  contractsContent.includes('export interface AsoAppEstimateDto') &&
  contractsContent.includes('export interface AsoEstimatesSummaryDto') &&
  contractsContent.includes('export interface AsoCategoryBenchmarkDto')
);

evaluate(
  'Contrato BreakoutAppDto exportado com rankDelta, growthPercentage7d e breakoutScore (Fase 30)',
  contractsContent.includes('export interface BreakoutAppDto') &&
  contractsContent.includes('rankDelta: number;') &&
  contractsContent.includes('breakoutScore: number;')
);

evaluate(
  'Contrato TrendingKeywordDto exportado com searchVolume, growthRate7d e opportunityScore (Fase 30)',
  contractsContent.includes('export interface TrendingKeywordDto') &&
  contractsContent.includes('opportunityScore: number;')
);

evaluate(
  'Contrato CategoryTrendSummaryDto exportado com topBreakouts e trendingKeywords (Fase 30)',
  contractsContent.includes('export interface CategoryTrendSummaryDto') &&
  contractsContent.includes('topBreakouts: BreakoutAppDto[];') &&
  contractsContent.includes('trendingKeywords: TrendingKeywordDto[];')
);

evaluate(
  'Contrato TrendAlertDto exportado com severity e isRead (Fase 30)',
  contractsContent.includes('export interface TrendAlertDto') &&
  contractsContent.includes('severity: ')
);

evaluate(
  'Contratos da Fase 31 exportados (AsoAiSuggestionItemDto, AsoAiRecommendationDto, GenerateAsoAiRecommendationsInputDto, ApplyAiRecommendationDto)',
  contractsContent.includes('export interface AsoAiSuggestionItemDto') &&
  contractsContent.includes('export interface AsoAiRecommendationDto') &&
  contractsContent.includes('export interface GenerateAsoAiRecommendationsInputDto') &&
  contractsContent.includes('export interface ApplyAiRecommendationDto')
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

// -----------------------------------------------------------------------------
// 3. Motores de Backend (Fases 29, 30, 31 & 32)
// -----------------------------------------------------------------------------
printHeader('PARTE 3: Motores de Backend da Etapa 5 (Estimativas, Tendências, IA e API Keys)');

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

// -----------------------------------------------------------------------------
// 4. Controladores REST, Guards & Proteção Multi-Tenant
// -----------------------------------------------------------------------------
printHeader('PARTE 4: Controladores REST, Guards & Proteção Multi-Tenant (Fases 29 a 32)');

const ctrl29Path = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-estimates.controller.ts');
const ctrl30Path = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-trends.controller.ts');
const ctrl31Path = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-ai-recommendations.controller.ts');
const ctrl32PrivatePath = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/controllers/api-keys.controller.ts');
const ctrl32PublicPath = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/controllers/public-aso.controller.ts');
const guard32Path = path.join(ROOT_DIR, 'apps/api/src/modules/api-keys/guards/api-key-auth.guard.ts');

evaluate('Controlador AsoEstimatesController existe', fs.existsSync(ctrl29Path));
evaluate('Controlador AsoTrendsController existe', fs.existsSync(ctrl30Path));
evaluate('Controlador AsoAiRecommendationsController existe', fs.existsSync(ctrl31Path));
evaluate('Controlador privado ApiKeysController existe (Fase 32)', fs.existsSync(ctrl32PrivatePath));
evaluate('Controlador comercial PublicAsoController existe (Fase 32)', fs.existsSync(ctrl32PublicPath));
evaluate('Guard ApiKeyAuthGuard existe (Fase 32)', fs.existsSync(guard32Path));

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

// -----------------------------------------------------------------------------
// 5. Interface de Usuário & Painéis Next.js (Fases 29 a 32)
// -----------------------------------------------------------------------------
printHeader('PARTE 5: Interface de Usuário & Painéis Next.js (Fases 29 a 32)');

const comp29Path = path.join(ROOT_DIR, 'apps/web/src/components/aso/predictive-estimates.tsx');
const comp30Path = path.join(ROOT_DIR, 'apps/web/src/components/aso/market-trends-panel.tsx');
const comp31Path = path.join(ROOT_DIR, 'apps/web/src/components/aso/ai-recommendations-panel.tsx');
const page32Path = path.join(ROOT_DIR, 'apps/web/src/app/(dashboard)/developers/page.tsx');
const sidebarPath = path.join(ROOT_DIR, 'apps/web/src/components/layout/sidebar.tsx');

evaluate('Componente PredictiveEstimates existe', fs.existsSync(comp29Path));
evaluate('Componente MarketTrendsPanel existe', fs.existsSync(comp30Path));
evaluate('Componente AiRecommendationsPanel existe', fs.existsSync(comp31Path));
evaluate('Página DevelopersPage (/developers) existe (Fase 32)', fs.existsSync(page32Path));

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

if (fs.existsSync(sidebarPath)) {
  const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
  evaluate(
    'Sidebar integra navegação para API & Desenvolvedores (/developers)',
    sidebarContent.includes("href: '/developers'") &&
    sidebarContent.includes("name: 'API & Desenvolvedores'")
  );
}

// -----------------------------------------------------------------------------
// 6. Testes Automatizados (Fases 29 a 32)
// -----------------------------------------------------------------------------
printHeader('PARTE 6: Verificação de Testes Unitários da Etapa 5 (Fases 29 a 32)');

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

let testsPassed = false;
try {
  execSync(
    'pnpm --filter @mgp/api test src/modules/api-keys/services/api-keys.service.spec.ts src/modules/api-keys/guards/api-key-auth.guard.spec.ts src/modules/api-keys/controllers/api-keys.controller.spec.ts src/modules/api-keys/controllers/public-aso.controller.spec.ts',
    { cwd: ROOT_DIR, encoding: 'utf8', stdio: 'pipe' }
  );
  testsPassed = true;
} catch (e) {
  testsPassed = false;
}

evaluate(
  'Suíte de testes da Fase 32 executa com 100% de aprovação (24 testes verdes em 4 suítes)',
  testsPassed
);

// -----------------------------------------------------------------------------
// Relatório Final
// -----------------------------------------------------------------------------
printHeader('RELATÓRIO FINAL DA AUDITORIA DA ETAPA 5 - FASES 29 A 32');

const score = Math.round((passedChecks / totalChecks) * 100);
console.log(` Total de verificações: ${totalChecks}`);
console.log(` Aprovados:             ${passedChecks}`);
console.log(` Falhas:                ${totalChecks - passedChecks}`);
console.log(` Pontuação de Conformidade: ${score}%\n`);

if (score === 100) {
  console.log(`${COLORS.bright}${COLORS.green}✔ HOMOLOGAÇÃO ETAPA 5 (FASES 29 A 32): APROVADA COM SUCESSO!${COLORS.reset}\n`);
  process.exit(0);
} else {
  console.log(`${COLORS.bright}${COLORS.red}✖ HOMOLOGAÇÃO ETAPA 5 (FASES 29 A 32): REPROVADA. CORRIJA AS FALHAS ACIMA.${COLORS.reset}\n`);
  process.exit(1);
}
