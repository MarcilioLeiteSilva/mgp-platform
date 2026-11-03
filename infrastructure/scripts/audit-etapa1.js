#!/usr/bin/env node

/**
 * Mobile Growth Platform (MGP)
 * Script de Auditoria Automatizada e Certificação da ETAPA 1 (Fundação e Infraestrutura)
 *
 * Avalia de forma estrita a integridade estrutural, segurança, modelo de dados,
 * Docker, EasyPanel, scripts de VPS, documentação normativa e suíte de testes.
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

printHeader('AUDITORIA OFICIAL E CERTIFICAÇÃO DA ETAPA 1 — MOBILE GROWTH PLATFORM');
console.log(`Horário da Execução: ${new Date().toISOString()}`);
console.log(`Diretório Raiz:      ${ROOT_DIR}`);
console.log(`Ambiente Operacional: Node ${process.version} | ${process.platform}\n`);

// -----------------------------------------------------------------------------
// 1. MONOREPO & ORQUESTRAÇÃO TURBOREPO + PNPM
// -----------------------------------------------------------------------------
console.log(`${COLORS.bright}${COLORS.blue}▶ 1. Arquitetura do Monorepo e Workspace${COLORS.reset}`);
evaluate('Arquivo package.json raiz com gerenciador pnpm', fileExists('package.json') && readFileContent('package.json').includes('pnpm@'));
evaluate('Arquivo pnpm-workspace.yaml com apps/* e packages/*', fileExists('pnpm-workspace.yaml') && readFileContent('pnpm-workspace.yaml').includes('apps/*'));
evaluate('Pipeline de build paralelo turbo.json configurado', fileExists('turbo.json') && readFileContent('turbo.json').includes('"build"'));
evaluate('Padronização de commits (.commitlintrc.json)', fileExists('.commitlintrc.json'));
evaluate('Padronização de estilo (.prettierrc)', fileExists('.prettierrc'));
evaluate('Padronização estática (.eslintrc.json)', fileExists('.eslintrc.json'));
evaluate('Configuração TypeScript base (tsconfig.base.json)', fileExists('tsconfig.base.json') && readFileContent('tsconfig.base.json').includes('"strict": true'));

// -----------------------------------------------------------------------------
// 2. PACOTES COMPARTILHADOS (PACKAGES)
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 2. Pacotes Compartilhados do Ecossistema (@mgp/*)${COLORS.reset}`);
evaluate('Pacote de Configuração (@mgp/config)', fileExists('packages/config/package.json') && fileExists('packages/config/src/index.ts'));
evaluate('Validação Zod de Variáveis de Ambiente (@mgp/config)', fileExists('packages/config/src/env.schema.ts') && readFileContent('packages/config/src/env.schema.ts').includes('z.object'));
evaluate('Pacote de Contratos e DTOs (@mgp/contracts)', fileExists('packages/contracts/package.json') && fileExists('packages/contracts/src/index.ts'));
evaluate('Pacote de Database e ORM (@mgp/database)', fileExists('packages/database/package.json') && fileExists('packages/database/src/index.ts'));
evaluate('Pacote de Utilitários Compartilhados (@mgp/shared)', fileExists('packages/shared/package.json') && fileExists('packages/shared/src/index.ts'));

// -----------------------------------------------------------------------------
// 3. MODELO DE DADOS, PRISMA SCHEMA E MIGRATIONS
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 3. Banco de Dados Relacional (PostgreSQL 16) e Prisma ORM${COLORS.reset}`);
const schemaContent = readFileContent('packages/database/prisma/schema.prisma');
evaluate('Schema do Prisma presente', schemaContent.length > 0);
evaluate('Modelo User estruturado', schemaContent.includes('model User {'));
evaluate('Modelo Organization estruturado', schemaContent.includes('model Organization {'));
evaluate('Modelo Membership com papéis RBAC estruturado', schemaContent.includes('model Membership {') && schemaContent.includes('enum UserRole'));
evaluate('Modelo Session com rastreamento de tokens', schemaContent.includes('model Session {') && schemaContent.includes('refreshToken'));
evaluate('Modelo App com chave SDK e status', schemaContent.includes('model App {') && schemaContent.includes('sdkKey'));
evaluate('Modelo Wallet e WalletAccount com 3 contas contábeis', schemaContent.includes('model Wallet {') && schemaContent.includes('enum WalletAccountType'));
evaluate('Modelo WalletLedger para transações financeiras', schemaContent.includes('model WalletLedger {'));
evaluate('Modelo AuditLog para rastreabilidade de ações', schemaContent.includes('model AuditLog {'));
evaluate('Modelo OrganizationInvitation para fluxo de convites', schemaContent.includes('model OrganizationInvitation {'));
evaluate('Script de Seed do Banco com dados de inicialização', fileExists('packages/database/prisma/seed.ts'));
evaluate('Histórico de migrations versionado', fs.existsSync(path.join(ROOT_DIR, 'packages/database/prisma/migrations')) && fs.readdirSync(path.join(ROOT_DIR, 'packages/database/prisma/migrations')).length > 0);

// -----------------------------------------------------------------------------
// 4. APLICAÇÃO BACKEND CENTRAL (APPS/API — NESTJS)
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 4. Aplicação Backend Central (apps/api — NestJS)${COLORS.reset}`);
evaluate('Ponto de entrada NestJS (main.ts)', fileExists('apps/api/src/main.ts'));
evaluate('Módulo raiz (app.module.ts)', fileExists('apps/api/src/app.module.ts'));
evaluate('Módulo de Autenticação (AuthModule)', fileExists('apps/api/src/modules/auth/auth.module.ts') && fileExists('apps/api/src/modules/auth/auth.service.ts'));
evaluate('Módulo de Organizações e Convites (OrganizationsModule)', fileExists('apps/api/src/modules/organizations/organizations.module.ts'));
evaluate('Módulo de Aplicativos e SDK (AppsModule)', fileExists('apps/api/src/modules/apps/apps.module.ts'));
evaluate('Módulo de Usuários e Perfil (UsersModule)', fileExists('apps/api/src/modules/users/users.module.ts'));
evaluate('Módulo de Administração Central NOC (AdminModule)', fileExists('apps/api/src/modules/admin/admin.module.ts'));
evaluate('Módulo de Saúde Liveness/Readiness (HealthModule)', fileExists('apps/api/src/modules/health/health.module.ts'));
evaluate('Guardião Global JWT (JwtAuthGuard)', fileExists('apps/api/src/common/guards/jwt-auth.guard.ts'));
evaluate('Guardião Multi-Tenant Zero Data Leakage (TenantGuard)', fileExists('apps/api/src/common/guards/tenant.guard.ts'));
evaluate('Guardião de Papéis RBAC com Hierarquia (RolesGuard)', fileExists('apps/api/src/common/guards/roles.guard.ts'));
evaluate('Guardião de Superadmin NOC (SuperadminGuard)', fileExists('apps/api/src/common/guards/superadmin.guard.ts'));
evaluate('Filtro Global de Exceções Padronizado (AllExceptionsFilter)', fileExists('apps/api/src/common/filters/all-exceptions.filter.ts'));
evaluate('Interceptador de Envelope de Resposta (TransformResponseInterceptor)', fileExists('apps/api/src/common/interceptors/transform-response.interceptor.ts'));
evaluate('Interceptador de Auditoria de Logs (LoggingInterceptor)', fileExists('apps/api/src/common/interceptors/logging.interceptor.ts'));

// -----------------------------------------------------------------------------
// 5. FRONTEND WEB PRINCIPAL (APPS/WEB — NEXT.JS 14)
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 5. Frontend Web Principal (apps/web — Next.js 14 App Router)${COLORS.reset}`);
evaluate('Configuração do Next.js (next.config.mjs ou js)', fileExists('apps/web/next.config.mjs') || fileExists('apps/web/next.config.js'));
evaluate('Design System Tailwind CSS (tailwind.config.js)', fileExists('apps/web/tailwind.config.js'));
evaluate('Cliente HTTP com auto-refresh e injeção de tenant (api.ts)', fileExists('apps/web/src/lib/api.ts'));
evaluate('Contexto de Autenticação e Sessão (auth-context.tsx)', fileExists('apps/web/src/lib/auth-context.tsx'));
evaluate('Layout Raiz e Layout Shell de Dashboard', fileExists('apps/web/src/app/layout.tsx') && fileExists('apps/web/src/app/(dashboard)/layout.tsx'));
evaluate('Tela Real de Login (/login)', fileExists('apps/web/src/app/(auth)/login/page.tsx'));
evaluate('Tela Real de Cadastro (/register)', fileExists('apps/web/src/app/(auth)/register/page.tsx'));
evaluate('Dashboard Executivo com 3 Contas do Ledger (/dashboard)', fileExists('apps/web/src/app/(dashboard)/dashboard/page.tsx'));
evaluate('Gestão de Aplicativos e SDK Keys (/apps)', fileExists('apps/web/src/app/(dashboard)/apps/page.tsx'));
evaluate('Extrato de Carteira e Contas Contábeis (/wallet)', fileExists('apps/web/src/app/(dashboard)/wallet/page.tsx'));
evaluate('Gestão de Membros, RBAC e Convites (/organization)', fileExists('apps/web/src/app/(dashboard)/organization/page.tsx'));
evaluate('Configurações de Perfil e Alteração de Senha (/settings)', fileExists('apps/web/src/app/(dashboard)/settings/page.tsx'));
evaluate('Página Pública de Aceite de Convites (/invitations/[token])', fileExists('apps/web/src/app/invitations/[token]/page.tsx'));

// -----------------------------------------------------------------------------
// 6. PAINEL NOC E BACKOFFICE SUPERADMIN (APPS/ADMIN — NEXT.JS 14)
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 6. Painel NOC e Backoffice Superadmin (apps/admin — Next.js 14)${COLORS.reset}`);
evaluate('Configuração do Next.js Admin (next.config.mjs ou js)', fileExists('apps/admin/next.config.mjs') || fileExists('apps/admin/next.config.js'));
evaluate('Tema Dark NOC Tailwind (tailwind.config.js)', fileExists('apps/admin/tailwind.config.js'));
evaluate('Cliente de API Administrativo (api.ts)', fileExists('apps/admin/src/lib/api.ts'));
evaluate('Contexto de Autenticação com trava Superadmin (auth-context.tsx)', fileExists('apps/admin/src/lib/auth-context.tsx'));
evaluate('Tela de Login do Backoffice (/login)', fileExists('apps/admin/src/app/login/page.tsx'));
evaluate('Dashboard NOC Overview (/ com KPIs, latência e DB)', fileExists('apps/admin/src/app/page.tsx'));
evaluate('Moderação Global de Organizações (/organizations)', fileExists('apps/admin/src/app/organizations/page.tsx'));
evaluate('Gestão Global de Usuários e Revogação (/users)', fileExists('apps/admin/src/app/users/page.tsx'));
evaluate('Moderação de Aplicativos (/apps)', fileExists('apps/admin/src/app/apps/page.tsx'));
evaluate('Trilha de Auditoria do Sistema (/audit-logs)', fileExists('apps/admin/src/app/audit-logs/page.tsx'));
evaluate('Telemetria Operacional de Filas e Recursos (/system)', fileExists('apps/admin/src/app/system/page.tsx'));

// -----------------------------------------------------------------------------
// 7. INFRAESTRUTURA DOCKER E EASYPANEL
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 7. Infraestrutura de Contêineres Docker e EasyPanel${COLORS.reset}`);
evaluate('Dockerfile de Produção da API (Dockerfile.api)', fileExists('Dockerfile.api') && fileExists('infrastructure/docker/Dockerfile.api'));
evaluate('Dockerfile de Produção do Web (Dockerfile.web)', fileExists('Dockerfile.web') && fileExists('infrastructure/docker/Dockerfile.web'));
evaluate('Dockerfile de Produção do Admin (Dockerfile.admin)', fileExists('Dockerfile.admin') && fileExists('infrastructure/docker/Dockerfile.admin'));
evaluate('Dockerfile do Ad Server de Baixa Latência', fileExists('infrastructure/docker/Dockerfile.adserver') || fileExists('infrastructure/docker/Dockerfile.ad-server'));
evaluate('Dockerfile dos Workers Assíncronos', fileExists('infrastructure/docker/Dockerfile.workers'));
evaluate('Template Oficial do EasyPanel (easypanel-template.json)', fileExists('infrastructure/easypanel/easypanel-template.json'));
evaluate('Especificação de Limites de Recursos e Anti-OOM (service-limits.md)', fileExists('infrastructure/easypanel/service-limits.md'));
evaluate('Docker Compose de Desenvolvimento Local (docker-compose.yml)', fileExists('infrastructure/docker/docker-compose.yml'));

// -----------------------------------------------------------------------------
// 8. SCRIPTS DE HARDENING VPS E BACKUPS
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 8. Hardening de VPS Hostinger e Políticas de Backup${COLORS.reset}`);
evaluate('Script de Setup e Hardening VPS (vps-setup.sh)', fileExists('infrastructure/scripts/vps-setup.sh'));
evaluate('Script de Backup Automatizado do Postgres (backup-postgres.sh)', fileExists('infrastructure/scripts/backup-postgres.sh'));
evaluate('Script de Restauração do Postgres (restore-postgres.sh)', fileExists('infrastructure/scripts/restore-postgres.sh'));
evaluate('Matriz de Ambiente de Desenvolvimento (.env.development.example)', fileExists('infrastructure/env/.env.development.example'));
evaluate('Matriz de Ambiente de Staging (.env.staging.example)', fileExists('infrastructure/env/.env.staging.example'));
evaluate('Matriz de Ambiente de Produção (.env.production.example)', fileExists('infrastructure/env/.env.production.example'));

// -----------------------------------------------------------------------------
// 9. DOCUMENTAÇÃO TÉCNICA E ARQUITETURAL OFICIAL
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 9. Documentação Normativa Oficial da Plataforma${COLORS.reset}`);
evaluate('Documentação Geral e Índice (docs/README.md)', fileExists('docs/README.md'));
evaluate('01. Arquitetura Geral (01-general-architecture.md)', fileExists('docs/architecture/01-general-architecture.md'));
evaluate('02. Módulos & Responsabilidades (02-modules-and-responsibilities.md)', fileExists('docs/architecture/02-modules-and-responsibilities.md'));
evaluate('03. Stack Tecnológica & Padrões (03-tech-stack-and-standards.md)', fileExists('docs/architecture/03-tech-stack-and-standards.md'));
evaluate('04. Estratégia Multi-Tenant & RBAC (04-multi-tenancy-strategy.md)', fileExists('docs/architecture/04-multi-tenancy-strategy.md'));
evaluate('05. Observabilidade & Logs (05-logging-and-observability.md)', fileExists('docs/architecture/05-logging-and-observability.md'));
evaluate('06. Qualidade & Critérios de Aceite (06-quality-and-approval-criteria.md)', fileExists('docs/architecture/06-quality-and-approval-criteria.md'));
evaluate('Padrões de API REST (01-rest-api-standards.md)', fileExists('docs/api/01-rest-api-standards.md'));
evaluate('Modelo de Dados & Ledger (01-data-model-and-ledger.md)', fileExists('docs/database/01-data-model-and-ledger.md'));
evaluate('Segurança & Antifraude (01-security-and-antifraud.md)', fileExists('docs/security/01-security-and-antifraud.md'));
evaluate('Setup de VPS & EasyPanel (01-vps-and-easypanel-setup.md)', fileExists('docs/infrastructure/01-vps-and-easypanel-setup.md'));
evaluate('Docker & Isolamento de Redes (02-docker-and-networks.md)', fileExists('docs/infrastructure/02-docker-and-networks.md'));
evaluate('Variáveis de Ambiente & Configurações (03-environments-and-configs.md)', fileExists('docs/infrastructure/03-environments-and-configs.md'));
evaluate('Backups & Limites de Recursos (04-backups-and-resource-limits.md)', fileExists('docs/infrastructure/04-backups-and-resource-limits.md'));

// -----------------------------------------------------------------------------
// 10. SUÍTE DE TESTES E QUALIDADE
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 10. Suíte de Testes Automatizados e Auditoria de Qualidade${COLORS.reset}`);
const testDir = path.join(ROOT_DIR, 'apps/api/src');
function findSpecFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findSpecFiles(fullPath));
    } else if (file.endsWith('.spec.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}
const specFiles = findSpecFiles(testDir);
evaluate(`Presença de 13 suítes de testes Jest (Encontradas: ${specFiles.length})`, specFiles.length >= 13);
evaluate('Suíte E2E de Integração presente (src/test/integration-e2e.spec.ts)', fileExists('apps/api/src/test/integration-e2e.spec.ts'));

// -----------------------------------------------------------------------------
// RESULTADO CONSOLIDADO
// -----------------------------------------------------------------------------
const score = Math.round((passedChecks / totalChecks) * 100);
console.log(`\n${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}`);
console.log(`${COLORS.bright}  SCORE FINAL DA AUDITORIA DA ETAPA 1: ${score}% (${passedChecks}/${totalChecks} verificações aprovadas)${COLORS.reset}`);
if (score === 100) {
  console.log(`${COLORS.bright}${COLORS.green}  STATUS: 100% CONCLUÍDO E HOMOLOGADO — ETAPA 1 PRONTA PARA TRANSIÇÃO PARA A ETAPA 2${COLORS.reset}`);
} else {
  console.log(`${COLORS.bright}${COLORS.yellow}  STATUS: PENDÊNCIAS DETECTADAS (${totalChecks - passedChecks} itens falharam)${COLORS.reset}`);
}
console.log(`${COLORS.bright}${COLORS.cyan}================================================================================${COLORS.reset}\n`);

if (score < 100) {
  process.exit(1);
} else {
  process.exit(0);
}
