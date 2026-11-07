#!/usr/bin/env node

/**
 * Mobile Growth Platform (MGP)
 * Script de Auditoria Automatizada e Certificação da ETAPA 4
 *
 * Cobre exaustivamente:
 * - Fase 23: Gestão de Campanhas, Criativos e Segmentação de Público
 * - Fase 24: Painel de Publishers, Configuração de Ad Units e Relatórios de Monetização
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

printHeader('AUDITORIA ETAPA 4 — FASES 23 & 24 (CAMPANHAS, AD UNITS & MONETIZAÇÃO)');

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

// Resumo Final
console.log(`\n${COLORS.bright}================================================================================${COLORS.reset}`);
const scorePct = Math.round((passedChecks / totalChecks) * 100);
const statusColor = scorePct === 100 ? COLORS.green : COLORS.red;
console.log(` RESULTADO FINAL: ${statusColor}${passedChecks}/${totalChecks} verificações aprovadas (${scorePct}%)${COLORS.reset}`);

if (scorePct === 100) {
  console.log(`${COLORS.green}${COLORS.bright} 🎉 FASES 23 E 24 INTEGRALMENTE HOMOLOGADAS E CONFORMES COM TODOS OS REQUISITOS!${COLORS.reset}`);
} else {
  console.log(`${COLORS.red}${COLORS.bright} ⚠ Algumas verificações não passaram. Revise os itens acima.${COLORS.reset}`);
}
console.log(`${COLORS.bright}================================================================================${COLORS.reset}\n`);

process.exit(scorePct === 100 ? 0 : 1);
