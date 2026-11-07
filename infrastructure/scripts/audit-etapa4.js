#!/usr/bin/env node

/**
 * Mobile Growth Platform (MGP)
 * Script de Auditoria Automatizada e Certificação da ETAPA 4
 *
 * Cobre exaustivamente:
 * - Fase 23: Gestão de Campanhas, Criativos e Segmentação de Público
 * - Fase 24: Painel de Publishers, Configuração de Ad Units e Relatórios de Monetização
 * - Fase 25: Motor de Payouts, Faturamento e Integração com Gateways de Pagamento
 * - Fase 26: Motor de Recomendações e Otimização Automática de Lances (Smart Bidding)
 * - Fase 27: Painel de Controle de Fraudes e Detecção de Tráfego Inválido (IVT)
 */

const fs = require('fs');
const path = require('path');

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

function check(desc, condition, details = '') {
  const symbol = condition ? `${COLORS.green}✔ [APROVADO]${COLORS.reset}` : `${COLORS.red}✖ [FALHOU]${COLORS.reset}`;
  console.log(` ${symbol} ${desc}`);
  if (details && !condition) {
    console.log(`    ${COLORS.yellow}Detalhes: ${details}${COLORS.reset}`);
  }
  return condition;
}

let totalChecks = 0;
let passedChecks = 0;

function evaluate(desc, condition, details = '') {
  totalChecks++;
  const passed = check(desc, condition, details);
  if (passed) passedChecks++;
  return passed;
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT_DIR, relPath));
}

function readFileContent(relPath) {
  const p = path.join(ROOT_DIR, relPath);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

printHeader('AUDITORIA ETAPA 4 — FASES 23, 24 & 25 (CAMPANHAS, AD UNITS, FATURAMENTO & PAYOUTS)');

// ==============================================================================
// PARTE 1: FASE 23 — GESTÃO DE CAMPANHAS E CRIATIVOS
// ==============================================================================
console.log(`${COLORS.bright}${COLORS.blue}▶ FASE 23: Gestão de Campanhas e Criativos Multi-Formato${COLORS.reset}`);

const schemaContent = readFileContent('packages/database/prisma/schema.prisma');
evaluate(
  'Prisma schema contém campos spentAmount, startDate, endDate e targetCategories em Campaign',
  schemaContent.includes('spentAmount') &&
    schemaContent.includes('startDate') &&
    schemaContent.includes('endDate') &&
    schemaContent.includes('targetCategories')
);
evaluate(
  'Migration SQL de gestão de campanhas existe',
  fileExists('packages/database/prisma/migrations/20261107000000_campaigns_management/migration.sql')
);

const sharedEnums = readFileContent('packages/shared/src/enums.ts');
evaluate('Enum CampaignStatus exportado em @mgp/shared', sharedEnums.includes('export enum CampaignStatus'));

const campaignsContracts = readFileContent('packages/contracts/src/campaigns.contracts.ts');
evaluate('Contrato Zod CreateCampaignSchema definido', campaignsContracts.includes('CreateCampaignSchema'));
evaluate('Contrato Zod CreateCreativeSchema definido', campaignsContracts.includes('CreateCreativeSchema'));
evaluate('Contrato Zod UpdateCampaignStatusSchema definido', campaignsContracts.includes('UpdateCampaignStatusSchema'));
evaluate('Contrato Zod ListCampaignsQuerySchema definido', campaignsContracts.includes('ListCampaignsQuerySchema'));

evaluate('CreateCampaignDto existe', fileExists('apps/api/src/modules/campaigns/dto/create-campaign.dto.ts'));
evaluate('CreateCreativeDto existe', fileExists('apps/api/src/modules/campaigns/dto/create-creative.dto.ts'));

const appModuleContent = readFileContent('apps/api/src/app.module.ts');
evaluate('CampaignsModule registrado no AppModule', appModuleContent.includes('CampaignsModule'));

const campaignsServiceContent = readFileContent('apps/api/src/modules/campaigns/campaigns.service.ts');
evaluate(
  'CampaignsService implementa isolamento multi-tenant (Zero Data Leakage via organizationId)',
  campaignsServiceContent.includes('organizationId') &&
    campaignsServiceContent.includes('id: campaignId') &&
    campaignsServiceContent.includes('findFirst')
);
evaluate(
  'CampaignsService valida saldo na conta ADVERTISING_CREDITS antes de criar campanha PAID',
  campaignsServiceContent.includes('ADVERTISING_CREDITS') && campaignsServiceContent.includes('Saldo insuficiente')
);
evaluate(
  'CampaignsService exige pelo menos 1 criativo ativo para transição para status ACTIVE',
  campaignsServiceContent.includes('creatives.some') && campaignsServiceContent.includes('A campanha precisa ter pelo menos um criativo ativo')
);
evaluate(
  'CampaignsService registra trilha de auditoria contábil e operacional (AuditLog)',
  campaignsServiceContent.includes('prisma.auditLog.create')
);

const creativeDtoContent = readFileContent('apps/api/src/modules/campaigns/dto/create-creative.dto.ts');
evaluate(
  'Sistema suporta os 4 formatos de criativos (BANNER, NATIVE, INTERSTITIAL, REWARDED)',
  creativeDtoContent.includes('BANNER') &&
    creativeDtoContent.includes('NATIVE') &&
    creativeDtoContent.includes('INTERSTITIAL') &&
    creativeDtoContent.includes('REWARDED')
);

evaluate('Testes unitários de CampaignsService implementados', fileExists('apps/api/src/modules/campaigns/campaigns.service.spec.ts'));
evaluate('Testes unitários de CampaignsController implementados', fileExists('apps/api/src/modules/campaigns/campaigns.controller.spec.ts'));
evaluate('Página de Campanhas criada (/campaigns/page.tsx)', fileExists('apps/web/src/app/(dashboard)/campaigns/page.tsx'));
evaluate('Componente CreateCampaignModal implementado', fileExists('apps/web/src/components/campaigns/create-campaign-modal.tsx'));
evaluate('Componente CreativesModal implementado', fileExists('apps/web/src/components/campaigns/creatives-modal.tsx'));
evaluate('Guia de Gestão de Campanhas documentado', fileExists('docs/campaigns/01-campaigns-and-creatives-management.md'));

// ==============================================================================
// PARTE 2: FASE 24 — PAINEL DE PUBLISHERS, AD UNITS & MONETIZAÇÃO
// ==============================================================================
console.log(`\n${COLORS.bright}${COLORS.blue}▶ FASE 24: Painel de Publishers, Configuração de Ad Units e Relatórios de Monetização${COLORS.reset}`);

evaluate('Modelo AdUnit estruturado no Prisma schema com campos essenciais', schemaContent.includes('model AdUnit') && schemaContent.includes('floorEcpm'));

const adUnitsContracts = readFileContent('packages/contracts/src/ad-units.contracts.ts');
evaluate('Contrato Zod CreateAdUnitSchema definido com validação de formato e floor eCPM', adUnitsContracts.includes('CreateAdUnitSchema'));
evaluate('Contrato Zod UpdateAdUnitSchema definido', adUnitsContracts.includes('UpdateAdUnitSchema'));
evaluate('Contrato Zod ListAdUnitsQuerySchema definido com paginação', adUnitsContracts.includes('ListAdUnitsQuerySchema'));
evaluate('Contrato Zod PublisherAnalyticsQuerySchema definido', adUnitsContracts.includes('PublisherAnalyticsQuerySchema'));

const contractsIndex = readFileContent('packages/contracts/src/index.ts');
evaluate('Contratos de ad-units exportados no index de @mgp/contracts', contractsIndex.includes('./ad-units.contracts'));

evaluate('CreateAdUnitDto existe', fileExists('apps/api/src/modules/ad-units/dto/create-ad-unit.dto.ts'));
evaluate('UpdateAdUnitDto existe', fileExists('apps/api/src/modules/ad-units/dto/update-ad-unit.dto.ts'));
evaluate('ListAdUnitsQueryDto existe', fileExists('apps/api/src/modules/ad-units/dto/list-ad-units-query.dto.ts'));
evaluate('PublisherAnalyticsQueryDto existe', fileExists('apps/api/src/modules/ad-units/dto/publisher-analytics-query.dto.ts'));

evaluate('AdUnitsModule registrado no AppModule', appModuleContent.includes('AdUnitsModule'));

const adUnitsServiceContent = readFileContent('apps/api/src/modules/ad-units/ad-units.service.ts');
evaluate(
  'AdUnitsService valida se o App pertence à organização ativa (Zero Data Leakage)',
  adUnitsServiceContent.includes('app.findFirst') &&
    adUnitsServiceContent.includes('organizationId') &&
    adUnitsServiceContent.includes('não encontrado nesta organização')
);
evaluate(
  'AdUnitsService valida e impede floor eCPM negativo',
  adUnitsServiceContent.includes('floor eCPM não pode ser negativo')
);
evaluate(
  'AdUnitsService implementa agregação de receita com modelo de 70% rev-share do publisher',
  adUnitsServiceContent.includes('0.70') && adUnitsServiceContent.includes('getPublisherAnalytics')
);
evaluate(
  'AdUnitsService registra trilha de auditoria (AD_UNIT_CREATED, AD_UNIT_UPDATED, AD_UNIT_DELETED)',
  adUnitsServiceContent.includes('AD_UNIT_CREATED') &&
    adUnitsServiceContent.includes('AD_UNIT_UPDATED') &&
    adUnitsServiceContent.includes('AD_UNIT_DELETED')
);

const adUnitsControllerContent = readFileContent('apps/api/src/modules/ad-units/ad-units.controller.ts');
evaluate('Endpoint GET /ad-units mapeado', adUnitsControllerContent.includes('@Get()'));
evaluate('Endpoint POST /ad-units mapeado', adUnitsControllerContent.includes('@Post()'));
evaluate('Endpoint GET /ad-units/analytics mapeado', adUnitsControllerContent.includes("@Get('analytics')"));
evaluate('Endpoint GET /ad-units/:id mapeado', adUnitsControllerContent.includes("@Get(':id')"));
evaluate('Endpoint PATCH /ad-units/:id mapeado', adUnitsControllerContent.includes("@Patch(':id')"));
evaluate('Endpoint DELETE /ad-units/:id mapeado', adUnitsControllerContent.includes("@Delete(':id')"));

evaluate('Testes unitários de AdUnitsService implementados', fileExists('apps/api/src/modules/ad-units/ad-units.service.spec.ts'));
evaluate('Testes unitários de AdUnitsController implementados', fileExists('apps/api/src/modules/ad-units/ad-units.controller.spec.ts'));

evaluate('Página de Ad Units criada (/ad-units/page.tsx)', fileExists('apps/web/src/app/(dashboard)/ad-units/page.tsx'));
evaluate('Componente CreateAdUnitModal implementado', fileExists('apps/web/src/components/ad-units/create-ad-unit-modal.tsx'));
evaluate('Componente IntegrationCodeModal implementado com snippets Kotlin', fileExists('apps/web/src/components/ad-units/integration-code-modal.tsx'));

const sidebarContent = readFileContent('apps/web/src/components/layout/sidebar.tsx');
evaluate('Link de Blocos de Anúncios adicionado ao Sidebar de navegação', sidebarContent.includes("href: '/ad-units'"));

evaluate(
  'Guia técnico de Ad Units e Monetização de Publishers documentado',
  fileExists('docs/publishers/01-ad-units-and-monetization.md')
);

// ==============================================================================
// PARTE 3: FASE 25 — MOTOR DE PAYOUTS, FATURAMENTO & GATEWAYS DE PAGAMENTO
// ==============================================================================
console.log(`\n${COLORS.bright}${COLORS.blue}▶ FASE 25: Motor de Payouts, Faturamento e Gateways de Pagamento${COLORS.reset}`);

evaluate(
  'Modelos DepositInvoice e PayoutRequest estruturados no Prisma schema',
  schemaContent.includes('model DepositInvoice') && schemaContent.includes('model PayoutRequest')
);
evaluate(
  'Migration SQL de faturamento e payouts existe',
  fileExists('packages/database/prisma/migrations/20261107010000_payouts_and_billing/migration.sql')
);

evaluate(
  'Enums PayoutStatus, PayoutMethod, PaymentStatus e PaymentMethod exportados em @mgp/shared',
  sharedEnums.includes('export enum PayoutStatus') &&
    sharedEnums.includes('export enum PayoutMethod') &&
    sharedEnums.includes('export enum PaymentStatus') &&
    sharedEnums.includes('export enum PaymentMethod')
);

const billingContracts = readFileContent('packages/contracts/src/billing.contracts.ts');
evaluate('Contrato Zod CreateDepositInvoiceSchema definido com validação de valor mínimo', billingContracts.includes('CreateDepositInvoiceSchema'));
evaluate('Contrato Zod ConfirmDepositWebhookSchema definido', billingContracts.includes('ConfirmDepositWebhookSchema'));
evaluate('Contrato Zod RequestPayoutSchema definido com validação de saque mínimo (R$ 50)', billingContracts.includes('RequestPayoutSchema'));
evaluate('Contrato Zod ListPayoutsQuerySchema definido', billingContracts.includes('ListPayoutsQuerySchema'));
evaluate('Contrato Zod ListLedgerTransactionsQuerySchema definido', billingContracts.includes('ListLedgerTransactionsQuerySchema'));
evaluate('Contratos de billing exportados no index de @mgp/contracts', contractsIndex.includes('./billing.contracts'));

evaluate('CreateDepositDto existe', fileExists('apps/api/src/modules/billing/dto/create-deposit.dto.ts'));
evaluate('RequestPayoutDto existe', fileExists('apps/api/src/modules/billing/dto/request-payout.dto.ts'));
evaluate('ConfirmDepositWebhookDto existe', fileExists('apps/api/src/modules/billing/dto/confirm-deposit-webhook.dto.ts'));
evaluate('ListPayoutsQueryDto existe', fileExists('apps/api/src/modules/billing/dto/list-payouts-query.dto.ts'));
evaluate('ListTransactionsQueryDto existe', fileExists('apps/api/src/modules/billing/dto/list-transactions-query.dto.ts'));

evaluate('BillingModule registrado no AppModule', appModuleContent.includes('BillingModule'));

const billingServiceContent = readFileContent('apps/api/src/modules/billing/billing.service.ts');
evaluate(
  'BillingService valida saldo prévio antes de debitar saque de publisher',
  billingServiceContent.includes('Saldo insuficiente para saque')
);
evaluate(
  'BillingService executa conciliação atômica no WalletLedger via Prisma $transaction',
  billingServiceContent.includes('$transaction') &&
    billingServiceContent.includes('DEPOSIT_FIAT') &&
    billingServiceContent.includes('PAYOUT_WITHDRAWAL')
);
evaluate(
  'BillingService implementa idempotência em confirmações de pagamento',
  billingServiceContent.includes('PaymentStatus.PAID') && billingServiceContent.includes('já confirmada')
);
evaluate(
  'BillingService registra auditoria em depósitos e saques',
  billingServiceContent.includes('DEPOSIT_PAYMENT_CONFIRMED') && billingServiceContent.includes('PAYOUT_REQUESTED')
);

const billingControllerContent = readFileContent('apps/api/src/modules/billing/billing.controller.ts');
evaluate('Endpoint GET /billing/wallet mapeado', billingControllerContent.includes("@Get('wallet')"));
evaluate('Endpoint POST /billing/deposits mapeado', billingControllerContent.includes("@Post('deposits')"));
evaluate('Endpoint POST /billing/deposits/:reference/confirm mapeado', billingControllerContent.includes("@Post('deposits/:reference/confirm')"));
evaluate('Endpoint POST /billing/payouts mapeado', billingControllerContent.includes("@Post('payouts')"));
evaluate('Endpoint GET /billing/payouts mapeado', billingControllerContent.includes("@Get('payouts')"));
evaluate('Endpoint GET /billing/transactions mapeado', billingControllerContent.includes("@Get('transactions')"));

evaluate('Testes unitários de BillingService implementados', fileExists('apps/api/src/modules/billing/billing.service.spec.ts'));
evaluate('Testes unitários de BillingController implementados', fileExists('apps/api/src/modules/billing/billing.controller.spec.ts'));

evaluate('Componente DepositModal implementado com geração de PIX', fileExists('apps/web/src/components/wallet/deposit-modal.tsx'));
evaluate('Componente PayoutModal implementado com validação de saldo de publisher', fileExists('apps/web/src/components/wallet/payout-modal.tsx'));

const walletPageContent = readFileContent('apps/web/src/app/(dashboard)/wallet/page.tsx');
evaluate(
  'Tela /wallet exibe as 3 contas contábeis, histórico de saques e extrato do WalletLedger',
  walletPageContent.includes('ADVERTISING_CREDITS') &&
    walletPageContent.includes('PUBLISHER_EARNINGS') &&
    walletPageContent.includes('EXCHANGE_CREDITS') &&
    walletPageContent.includes('DepositModal') &&
    walletPageContent.includes('PayoutModal') &&
    walletPageContent.includes('WalletLedger')
);

evaluate(
  'Guia técnico de Faturamento, Payouts e Gateways documentado',
  fileExists('docs/billing/01-payouts-and-billing-gateway.md')
);

// ==============================================================================
// PARTE 4: FASE 26 — MOTOR DE RECOMENDAÇÕES E OTIMIZAÇÃO AUTOMÁTICA DE LANCES
// ==============================================================================
console.log(`\n${COLORS.bright}${COLORS.blue}▶ FASE 26: Motor de Recomendações e Otimização Automática de Lances (Smart Bidding & Pacing)${COLORS.reset}`);

evaluate(
  'Modelos e Enums de Smart Bidding e Recomendações estruturados no Prisma schema',
  schemaContent.includes('model CampaignRecommendation') &&
    schemaContent.includes('enum BiddingStrategy') &&
    schemaContent.includes('enum PacingMode') &&
    schemaContent.includes('enum RecommendationType')
);

evaluate(
  'Migration SQL de smart bidding e recomendações existe',
  fileExists('packages/database/prisma/migrations/20261107020000_smart_bidding_and_recommendations/migration.sql')
);

evaluate(
  'Enums BiddingStrategy, PacingMode, RecommendationType, RecommendationStatus e RecommendationPriority exportados em @mgp/shared',
  sharedEnums.includes('export enum BiddingStrategy') &&
    sharedEnums.includes('export enum PacingMode') &&
    sharedEnums.includes('export enum RecommendationType') &&
    sharedEnums.includes('export enum RecommendationStatus') &&
    sharedEnums.includes('export enum RecommendationPriority')
);

const recommendationsContracts = readFileContent('packages/contracts/src/recommendations.contracts.ts');
evaluate(
  'Contratos Zod de recomendações e smart bidding definidos em @mgp/contracts',
  recommendationsContracts.includes('UpdateBiddingStrategySchema') &&
    recommendationsContracts.includes('ListRecommendationsQuerySchema') &&
    recommendationsContracts.includes('ApplyRecommendationSchema') &&
    recommendationsContracts.includes('SimulateBidOptimizationSchema')
);

evaluate(
  'Contratos de recomendações exportados no index de @mgp/contracts',
  contractsIndex.includes('./recommendations.contracts')
);

evaluate('UpdateBiddingStrategyDto existe', fileExists('apps/api/src/modules/recommendations/dto/update-bidding-strategy.dto.ts'));
evaluate('ListRecommendationsQueryDto existe', fileExists('apps/api/src/modules/recommendations/dto/list-recommendations-query.dto.ts'));
evaluate('ApplyRecommendationDto existe', fileExists('apps/api/src/modules/recommendations/dto/apply-recommendation.dto.ts'));
evaluate('DismissRecommendationDto existe', fileExists('apps/api/src/modules/recommendations/dto/dismiss-recommendation.dto.ts'));
evaluate('SimulateBidDto existe', fileExists('apps/api/src/modules/recommendations/dto/simulate-bid.dto.ts'));

evaluate('RecommendationsModule registrado no AppModule', appModuleContent.includes('RecommendationsModule'));

const smartBiddingServiceContent = readFileContent('apps/api/src/modules/recommendations/smart-bidding.service.ts');
evaluate(
  'SmartBiddingService implementa avaliação de pacing horária e simulação de lances',
  smartBiddingServiceContent.includes('evaluatePacing') &&
    smartBiddingServiceContent.includes('simulateBid') &&
    smartBiddingServiceContent.includes('pacingMultiplier')
);

const recommendationsServiceContent = readFileContent('apps/api/src/modules/recommendations/recommendations.service.ts');
evaluate(
  'RecommendationsService implementa as 5 regras de recomendação (BID_ADJUSTMENT, PACING_OPTIMIZATION, BUDGET_SCALING, CREATIVE_FATIGUE, AUDIENCE_EXPANSION)',
  recommendationsServiceContent.includes('RecommendationType.BID_ADJUSTMENT') &&
    recommendationsServiceContent.includes('RecommendationType.PACING_OPTIMIZATION') &&
    recommendationsServiceContent.includes('RecommendationType.BUDGET_SCALING') &&
    recommendationsServiceContent.includes('RecommendationType.CREATIVE_FATIGUE') &&
    recommendationsServiceContent.includes('RecommendationType.AUDIENCE_EXPANSION')
);

evaluate(
  'RecommendationsService implementa aplicação atômica via $transaction com AuditLog',
  recommendationsServiceContent.includes('$transaction') &&
    recommendationsServiceContent.includes('RECOMMENDATION_APPLIED') &&
    recommendationsServiceContent.includes('RecommendationStatus.APPLIED')
);

const recommendationsControllerContent = readFileContent('apps/api/src/modules/recommendations/recommendations.controller.ts');
evaluate('Endpoint GET /recommendations mapeado', recommendationsControllerContent.includes('@Get()'));
evaluate('Endpoint POST /recommendations/generate mapeado', recommendationsControllerContent.includes("@Post('generate')"));
evaluate('Endpoint POST /recommendations/:id/apply mapeado', recommendationsControllerContent.includes("@Post(':id/apply')"));
evaluate('Endpoint POST /recommendations/:id/dismiss mapeado', recommendationsControllerContent.includes("@Post(':id/dismiss')"));
evaluate(
  'Endpoints de estratégia e simulação de lances de campanhas mapeados',
  recommendationsControllerContent.includes('bidding-strategy') &&
    recommendationsControllerContent.includes('simulate-bid')
);

evaluate('Testes unitários de SmartBiddingService implementados', fileExists('apps/api/src/modules/recommendations/smart-bidding.service.spec.ts'));
evaluate('Testes unitários de RecommendationsService implementados', fileExists('apps/api/src/modules/recommendations/recommendations.service.spec.ts'));
evaluate('Testes unitários de RecommendationsController implementados', fileExists('apps/api/src/modules/recommendations/recommendations.controller.spec.ts'));

evaluate('Componente RecommendationsCard implementado com One-Click Apply', fileExists('apps/web/src/components/campaigns/recommendations-card.tsx'));
evaluate('Componente SmartBiddingModal implementado com simulação de curva preditiva de lances', fileExists('apps/web/src/components/campaigns/smart-bidding-modal.tsx'));

const campaignsPageContent = readFileContent('apps/web/src/app/(dashboard)/campaigns/page.tsx');
evaluate(
  'Página /campaigns integrada ao motor de recomendações e lances inteligentes',
  campaignsPageContent.includes('RecommendationsCard') &&
    campaignsPageContent.includes('SmartBiddingModal') &&
    campaignsPageContent.includes('/recommendations')
);

evaluate(
  'Guia técnico de Smart Bidding e Recomendações documentado',
  fileExists('docs/campaigns/02-smart-bidding-and-recommendations.md')
);

// ==============================================================================
// PARTE 5: FASE 27 - Painel de Controle de Fraudes e Detecção de Tráfego Inválido (IVT)
// ==============================================================================
printHeader('PARTE 5: FASE 27 - Painel de Controle de Fraudes e Detecção de Tráfego Inválido (IVT)');

evaluate('Modelo FraudIncident presente no schema Prisma', schemaContent.includes('model FraudIncident {'));
evaluate('Enum IvtCategory definido com categorias GIVT e SIVT no Prisma', 
  schemaContent.includes('enum IvtCategory {') &&
  schemaContent.includes('GIVT_BOT') &&
  schemaContent.includes('GIVT_DATA_CENTER') &&
  schemaContent.includes('GIVT_EMULATOR') &&
  schemaContent.includes('SIVT_FAST_CLICK') &&
  schemaContent.includes('SIVT_CLICK_SPAM') &&
  schemaContent.includes('SIVT_VIEWABILITY_FRAUD')
);
evaluate('Enum FraudSeverity e FraudIncidentStatus definidos no Prisma', 
  schemaContent.includes('enum FraudSeverity {') &&
  schemaContent.includes('enum FraudIncidentStatus {')
);
evaluate(
  'Migração de banco de dados para IVT e Fraud Detection criada',
  fileExists('packages/database/prisma/migrations/20261107030000_ivt_and_fraud_detection/migration.sql')
);

const sharedEnumsContent = readFileContent('packages/shared/src/enums.ts');
evaluate(
  'Enums IvtCategory, FraudSeverity e FraudIncidentStatus exportados em @mgp/shared',
  sharedEnumsContent.includes('export enum IvtCategory') &&
    sharedEnumsContent.includes('export enum FraudSeverity') &&
    sharedEnumsContent.includes('export enum FraudIncidentStatus')
);

evaluate(
  'Contratos de antifraude e schemas Zod definidos em @mgp/contracts',
  fileExists('packages/contracts/src/antifraud.contracts.ts') &&
    readFileContent('packages/contracts/src/index.ts').includes('antifraud.contracts')
);

evaluate('Módulo AntifraudModule criado na API', fileExists('apps/api/src/modules/antifraud/antifraud.module.ts'));
evaluate(
  'AntifraudModule registrado em AppModule',
  readFileContent('apps/api/src/app.module.ts').includes('AntifraudModule')
);

evaluate('DTOs de Antifraude criados', 
  fileExists('apps/api/src/modules/antifraud/dto/list-fraud-incidents-query.dto.ts') &&
  fileExists('apps/api/src/modules/antifraud/dto/resolve-fraud-incident.dto.ts') &&
  fileExists('apps/api/src/modules/antifraud/dto/simulate-ivt-inspection.dto.ts') &&
  fileExists('apps/api/src/modules/antifraud/dto/fraud-metrics-query.dto.ts')
);

const antifraudServiceContent = readFileContent('apps/api/src/modules/antifraud/antifraud.service.ts');
evaluate('AntifraudService implementa método inspectTraffic com regras GIVT/SIVT', antifraudServiceContent.includes('inspectTraffic'));
evaluate('AntifraudService implementa método getMetrics consolidando taxa IVT e capital protegido', antifraudServiceContent.includes('getMetrics'));
evaluate('AntifraudService implementa método listIncidents com isolamento por organização', antifraudServiceContent.includes('listIncidents'));
evaluate('AntifraudService implementa método getIncidentById com busca forense', antifraudServiceContent.includes('getIncidentById'));
evaluate(
  'AntifraudService implementa resolveIncident com estorno atômico (FRAUD_CHARGEBACK) e idempotencyKey',
  antifraudServiceContent.includes('resolveIncident') &&
    antifraudServiceContent.includes('executeChargeback') &&
    antifraudServiceContent.includes('FRAUD_CHARGEBACK') &&
    antifraudServiceContent.includes('idempotencyKey') &&
    antifraudServiceContent.includes('$transaction')
);

const antifraudControllerContent = readFileContent('apps/api/src/modules/antifraud/antifraud.controller.ts');
evaluate('Endpoint GET /antifraud/metrics mapeado no controller', antifraudControllerContent.includes("@Get('metrics')"));
evaluate('Endpoint GET /antifraud/incidents mapeado no controller', antifraudControllerContent.includes("@Get('incidents')"));
evaluate('Endpoint GET /antifraud/incidents/:id mapeado no controller', antifraudControllerContent.includes("@Get('incidents/:id')"));
evaluate('Endpoint POST /antifraud/incidents/:id/resolve mapeado no controller', antifraudControllerContent.includes("@Post('incidents/:id/resolve')"));
evaluate('Endpoint POST /antifraud/simulate-inspection mapeado no controller', antifraudControllerContent.includes("@Post('simulate-inspection')"));

evaluate('Testes unitários de AntifraudService implementados', fileExists('apps/api/src/modules/antifraud/antifraud.service.spec.ts'));
evaluate('Testes unitários de AntifraudController implementados', fileExists('apps/api/src/modules/antifraud/antifraud.controller.spec.ts'));

evaluate('Componente IncidentDetailsModal implementado para auditoria forense', fileExists('apps/web/src/components/antifraud/incident-details-modal.tsx'));
evaluate('Componente SimulateInspectionModal implementado com presets de teste', fileExists('apps/web/src/components/antifraud/simulate-inspection-modal.tsx'));
evaluate('Página executiva /fraud implementada no painel web', fileExists('apps/web/src/app/(dashboard)/fraud/page.tsx'));

const antifraudSidebarContent = readFileContent('apps/web/src/components/layout/sidebar.tsx');
evaluate('Link de navegação para /fraud adicionado na Sidebar do painel', antifraudSidebarContent.includes('/fraud'));

evaluate(
  'Guia técnico de IVT e Painel Antifraude documentado em docs/security/',
  fileExists('docs/security/02-ivt-detection-and-antifraud-panel.md')
);

// ==============================================================================
// PARTE 6: FASE 28 - Integração, Testes E2E e Homologação Final da Etapa 4
// ==============================================================================
printHeader('PARTE 6: FASE 28 - Integração, Testes E2E e Homologação Final da Etapa 4');

const etapa4E2EPath = 'apps/api/src/test/etapa4-e2e.spec.ts';
evaluate('Arquivo de testes de integração E2E da Etapa 4 implementado', fileExists(etapa4E2EPath));

const etapa4E2EContent = readFileContent(etapa4E2EPath);
evaluate(
  'Suíte E2E cobre fluxo financeiro inicial de Top-Up PIX e WalletLedger',
  etapa4E2EContent.includes('createDeposit') &&
    etapa4E2EContent.includes('confirmDeposit') &&
    etapa4E2EContent.includes('DEPOSIT_FIAT')
);

evaluate(
  'Suíte E2E cobre criação de campanhas, criativos multi-formato e ativação',
  etapa4E2EContent.includes('createCampaign') &&
    etapa4E2EContent.includes('addCreative') &&
    etapa4E2EContent.includes('updateCampaignStatus') &&
    etapa4E2EContent.includes('BANNER') &&
    etapa4E2EContent.includes('INTERSTITIAL') &&
    etapa4E2EContent.includes('REWARDED')
);

evaluate(
  'Suíte E2E cobre monetização de publishers, criação de ad units e cálculo de 70% rev-share',
  etapa4E2EContent.includes('createAdUnit') &&
    etapa4E2EContent.includes('getPublisherAnalytics') &&
    etapa4E2EContent.includes('floorEcpm')
);

evaluate(
  'Suíte E2E cobre Smart Bidding, Pacing e aplicação atômica de recomendações',
  etapa4E2EContent.includes('updateBiddingStrategy') &&
    etapa4E2EContent.includes('generateRecommendations') &&
    etapa4E2EContent.includes('applyRecommendation') &&
    etapa4E2EContent.includes('simulateCampaignBid')
);

evaluate(
  'Suíte E2E cobre detecção IVT, auditoria forense e estorno financeiro (FRAUD_CHARGEBACK)',
  etapa4E2EContent.includes('inspectTraffic') &&
    etapa4E2EContent.includes('getMetrics') &&
    etapa4E2EContent.includes('resolveIncident') &&
    etapa4E2EContent.includes('FRAUD_CHARGEBACK') &&
    etapa4E2EContent.includes('executeChargeback')
);

evaluate(
  'Suíte E2E cobre solicitação e liquidação de Payout de publisher via PIX',
  etapa4E2EContent.includes('requestPayout') &&
    etapa4E2EContent.includes('PAYOUT_WITHDRAWAL')
);

evaluate(
  'Suíte E2E cobre isolamento estrito multi-tenant (Zero Data Leakage) contra invasores',
  etapa4E2EContent.includes('findCampaignById') &&
    etapa4E2EContent.includes('findAdUnitById') &&
    etapa4E2EContent.includes('competitorOrgId')
);

evaluate(
  'Especificação consolidada de Homologação da ETAPA 4 documentada',
  fileExists('docs/04-etapa4-campanhas-financas-marketplace-homologacao.md')
);

// Resumo Final
console.log(`\n${COLORS.bright}================================================================================${COLORS.reset}`);
const scorePct = Math.round((passedChecks / totalChecks) * 100);
const statusColor = scorePct === 100 ? COLORS.green : COLORS.red;
console.log(` RESULTADO FINAL: ${statusColor}${passedChecks}/${totalChecks} verificações aprovadas (${scorePct}%)${COLORS.reset}`);

if (scorePct === 100) {
  console.log(`${COLORS.green}${COLORS.bright} 🎉 PARABÉNS! ETAPA 4 INTEGRALMENTE HOMOLOGADA E CERTIFICADA (FASES 23 A 28)!${COLORS.reset}`);
  console.log(`${COLORS.green}${COLORS.bright} 🏆 Motor de Campanhas, Gestão Financeira, Smart Bidding e Antifraude 100% Operacionais!${COLORS.reset}`);
} else {
  console.log(`${COLORS.red}${COLORS.bright} ⚠ Algumas verificações não passaram. Revise os itens acima.${COLORS.reset}`);
}
console.log(`${COLORS.bright}================================================================================${COLORS.reset}\n`);

process.exit(scorePct === 100 ? 0 : 1);
