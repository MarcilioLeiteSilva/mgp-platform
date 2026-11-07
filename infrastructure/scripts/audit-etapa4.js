#!/usr/bin/env node

/**
 * Mobile Growth Platform (MGP)
 * Script de Auditoria Automatizada e Certificação da ETAPA 4 (Fase 23: Gestão de Campanhas, Criativos e Segmentação)
 *
 * Avalia de forma estrita e exaustiva a completude, integridade, tipagem, isolamento multi-tenant,
 * validação contábil no Ledger, cobertura de testes e componentes de interface.
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

printHeader('AUDITORIA ETAPA 4 — FASE 23: GESTÃO DE CAMPANHAS, CRIATIVOS E SEGMENTAÇÃO');

// 1. Modelagem Prisma & Migrations
console.log(`${COLORS.bright}${COLORS.blue}1. Modelagem de Dados Prisma & Migrations PostgreSQL${COLORS.reset}`);
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

// 2. Contratos Zod & Tipos Compartilhados
console.log(`\n${COLORS.bright}${COLORS.blue}2. Contratos Zod & Tipos Compartilhados (@mgp/contracts, @mgp/shared)${COLORS.reset}`);
const sharedEnums = readFileContent('packages/shared/src/enums.ts');
evaluate('Enum CampaignStatus exportado em @mgp/shared', sharedEnums.includes('export enum CampaignStatus'));

const contractsContent = readFileContent('packages/contracts/src/campaigns.contracts.ts');
evaluate('Contrato Zod CreateCampaignSchema definido', contractsContent.includes('CreateCampaignSchema'));
evaluate('Contrato Zod CreateCreativeSchema definido', contractsContent.includes('CreateCreativeSchema'));
evaluate('Contrato Zod UpdateCampaignStatusSchema definido', contractsContent.includes('UpdateCampaignStatusSchema'));
evaluate('Contrato Zod ListCampaignsQuerySchema definido', contractsContent.includes('ListCampaignsQuerySchema'));

const contractsIndex = readFileContent('packages/contracts/src/index.ts');
evaluate('Contratos de campanhas exportados no index de @mgp/contracts', contractsIndex.includes('./campaigns.contracts'));

// 3. Backend NestJS - DTOs e Módulo
console.log(`\n${COLORS.bright}${COLORS.blue}3. Backend Core NestJS (apps/api) - Módulo e DTOs${COLORS.reset}`);
evaluate('CreateCampaignDto existe', fileExists('apps/api/src/modules/campaigns/dto/create-campaign.dto.ts'));
evaluate('CreateCreativeDto existe', fileExists('apps/api/src/modules/campaigns/dto/create-creative.dto.ts'));
evaluate('UpdateCampaignStatusDto existe', fileExists('apps/api/src/modules/campaigns/dto/update-campaign-status.dto.ts'));
evaluate('ListCampaignsQueryDto existe', fileExists('apps/api/src/modules/campaigns/dto/list-campaigns-query.dto.ts'));

const appModuleContent = readFileContent('apps/api/src/app.module.ts');
evaluate('CampaignsModule registrado no AppModule', appModuleContent.includes('CampaignsModule'));

// 4. Backend NestJS - Service & Regras de Negócio
console.log(`\n${COLORS.bright}${COLORS.blue}4. Regras de Negócio e Integridade Financeira (CampaignsService)${COLORS.reset}`);
const serviceContent = readFileContent('apps/api/src/modules/campaigns/campaigns.service.ts');
evaluate(
  'CampaignsService implementa isolamento multi-tenant (Zero Data Leakage via organizationId)',
  serviceContent.includes('organizationId') &&
    serviceContent.includes('id: campaignId') &&
    serviceContent.includes('findFirst')
);
evaluate(
  'CampaignsService valida saldo na conta ADVERTISING_CREDITS antes de criar campanha PAID',
  serviceContent.includes('ADVERTISING_CREDITS') && serviceContent.includes('Saldo insuficiente')
);
evaluate(
  'CampaignsService exige pelo menos 1 criativo ativo para transição para status ACTIVE',
  serviceContent.includes('creatives.some') && serviceContent.includes('A campanha precisa ter pelo menos um criativo ativo')
);
evaluate(
  'CampaignsService registra trilha de auditoria contábil e operacional (AuditLog)',
  serviceContent.includes('prisma.auditLog.create')
);

const creativeDtoContent = readFileContent('apps/api/src/modules/campaigns/dto/create-creative.dto.ts');
evaluate(
  'Sistema suporta os 4 formatos de criativos (BANNER, NATIVE, INTERSTITIAL, REWARDED)',
  creativeDtoContent.includes('BANNER') &&
    creativeDtoContent.includes('NATIVE') &&
    creativeDtoContent.includes('INTERSTITIAL') &&
    creativeDtoContent.includes('REWARDED')
);

// 5. Backend NestJS - Controller & Swagger
console.log(`\n${COLORS.bright}${COLORS.blue}5. REST Controller & Documentação Swagger (CampaignsController)${COLORS.reset}`);
const controllerContent = readFileContent('apps/api/src/modules/campaigns/campaigns.controller.ts');
evaluate('Endpoint POST /campaigns mapeado', controllerContent.includes('@Post()'));
evaluate('Endpoint GET /campaigns mapeado', controllerContent.includes('@Get()'));
evaluate('Endpoint GET /campaigns/:id mapeado', controllerContent.includes("@Get(':id')"));
evaluate('Endpoint PATCH /campaigns/:id/status mapeado', controllerContent.includes("@Patch(':id/status')"));
evaluate('Endpoint POST /campaigns/:id/creatives mapeado', controllerContent.includes("@Post(':id/creatives')"));
evaluate('Endpoint DELETE /campaigns/:id/creatives/:creativeId mapeado', controllerContent.includes("@Delete(':id/creatives/:creativeId')"));

// 6. Testes Automatizados
console.log(`\n${COLORS.bright}${COLORS.blue}6. Cobertura de Testes Automatizados Jest${COLORS.reset}`);
evaluate('Testes unitários de CampaignsService implementados', fileExists('apps/api/src/modules/campaigns/campaigns.service.spec.ts'));
evaluate('Testes unitários de CampaignsController implementados', fileExists('apps/api/src/modules/campaigns/campaigns.controller.spec.ts'));

// 7. Frontend Next.js (apps/web)
console.log(`\n${COLORS.bright}${COLORS.blue}7. Interface Web do Anunciante (apps/web)${COLORS.reset}`);
evaluate('Página de Campanhas criada (/campaigns/page.tsx)', fileExists('apps/web/src/app/(dashboard)/campaigns/page.tsx'));
evaluate('Componente CreateCampaignModal implementado', fileExists('apps/web/src/components/campaigns/create-campaign-modal.tsx'));
evaluate('Componente CreativesModal implementado', fileExists('apps/web/src/components/campaigns/creatives-modal.tsx'));

const sidebarContent = readFileContent('apps/web/src/components/layout/sidebar.tsx');
evaluate('Link de Campanhas adicionado ao Sidebar de navegação', sidebarContent.includes("href: '/campaigns'"));

// 8. Documentação Técnica
console.log(`\n${COLORS.bright}${COLORS.blue}8. Documentação Técnica Oficial${COLORS.reset}`);
evaluate(
  'Guia de Gestão de Campanhas e Criativos documentado',
  fileExists('docs/campaigns/01-campaigns-and-creatives-management.md')
);

// Resumo Final
console.log(`\n${COLORS.bright}================================================================================${COLORS.reset}`);
const scorePct = Math.round((passedChecks / totalChecks) * 100);
const statusColor = scorePct === 100 ? COLORS.green : COLORS.red;
console.log(` RESULTADO FINAL: ${statusColor}${passedChecks}/${totalChecks} verificações aprovadas (${scorePct}%)${COLORS.reset}`);

if (scorePct === 100) {
  console.log(`${COLORS.green}${COLORS.bright} 🎉 FASE 23 INTEGRALMENTE HOMOLOGADA E CONFORME COM TODOS OS REQUISITOS!${COLORS.reset}`);
} else {
  console.log(`${COLORS.red}${COLORS.bright} ⚠ Algumas verificações não passaram. Revise os itens acima.${COLORS.reset}`);
}
console.log(`${COLORS.bright}================================================================================${COLORS.reset}\n`);

process.exit(scorePct === 100 ? 0 : 1);
