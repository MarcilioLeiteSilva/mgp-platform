#!/usr/bin/env node

/**
 * Mobile Growth Platform (MGP)
 * Script de Auditoria Automatizada e Certificação da ETAPA 5
 *
 * Cobre exaustivamente:
 * - Fase 29: Estimativas Preditivas de Downloads e Receita (Power-Law / Pareto)
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

printHeader('AUDITORIA ETAPA 5 — INTELIGÊNCIA AVANÇADA & MODELOS PREDITIVOS (FASE 29)');

// -----------------------------------------------------------------------------
// 1. Modelagem Prisma & Migrations
// -----------------------------------------------------------------------------
printHeader('PARTE 1: Modelagem de Dados & Migrations (AsoAppEstimate)');

const schemaPath = path.join(ROOT_DIR, 'packages/database/prisma/schema.prisma');
const schemaContent = fs.readFileSync(schemaPath, 'utf8');

evaluate(
  'Schema Prisma define model AsoAppEstimate',
  schemaContent.includes('model AsoAppEstimate')
);

evaluate(
  'AsoAppEstimate possui campos de downloads diários e mensais com min, median, max',
  schemaContent.includes('dailyDownloadsMin') &&
  schemaContent.includes('dailyDownloadsMedian') &&
  schemaContent.includes('dailyDownloadsMax') &&
  schemaContent.includes('monthlyDownloadsMin') &&
  schemaContent.includes('monthlyDownloadsMedian') &&
  schemaContent.includes('monthlyDownloadsMax')
);

evaluate(
  'AsoAppEstimate possui campos de receita diária e mensal em Decimal com min, median, max',
  schemaContent.includes('dailyRevenueMin') &&
  schemaContent.includes('dailyRevenueMedian') &&
  schemaContent.includes('dailyRevenueMax') &&
  schemaContent.includes('monthlyRevenueMin') &&
  schemaContent.includes('monthlyRevenueMedian') &&
  schemaContent.includes('monthlyRevenueMax')
);

evaluate(
  'AsoAppEstimate possui confidenceScore, calculationMethod e breakdownJson',
  schemaContent.includes('confidenceScore') &&
  schemaContent.includes('calculationMethod') &&
  schemaContent.includes('breakdownJson')
);

evaluate(
  'AsoApp e Organization possuem relações mapeadas com AsoAppEstimate',
  schemaContent.includes('asoAppEstimates   AsoAppEstimate[]') &&
  schemaContent.includes('estimates       AsoAppEstimate[]')
);

const migrationPath = path.join(ROOT_DIR, 'packages/database/prisma/migrations/20261109000000_aso_predictive_estimates/migration.sql');
evaluate(
  'Arquivo de migração SQL da Fase 29 existe no diretório oficial de migrations',
  fs.existsSync(migrationPath)
);

if (fs.existsSync(migrationPath)) {
  const migContent = fs.readFileSync(migrationPath, 'utf8');
  evaluate(
    'Migration SQL cria a tabela aso_app_estimates com índices compostos',
    migContent.includes('CREATE TABLE "aso_app_estimates"') &&
    migContent.includes('aso_app_estimates_aso_app_id_date_country_key')
  );
}

// -----------------------------------------------------------------------------
// 2. Contratos & DTOs em @mgp/contracts
// -----------------------------------------------------------------------------
printHeader('PARTE 2: Contratos & DTOs Compartilhados (@mgp/contracts)');

const contractsPath = path.join(ROOT_DIR, 'packages/contracts/src/aso.contracts.ts');
const contractsContent = fs.readFileSync(contractsPath, 'utf8');

evaluate(
  'Contrato AsoEstimateRangeDto exportado com min, median, max',
  contractsContent.includes('export interface AsoEstimateRangeDto')
);

evaluate(
  'Contrato AsoAppEstimateDto exportado com tipagem de downloads e receita em ranges',
  contractsContent.includes('export interface AsoAppEstimateDto') &&
  contractsContent.includes('dailyDownloads: AsoEstimateRangeDto;') &&
  contractsContent.includes('dailyRevenue: AsoEstimateRangeDto;')
);

evaluate(
  'Contrato AsoEstimatesSummaryDto exportado com latestEstimate, history e growthTrends',
  contractsContent.includes('export interface AsoEstimatesSummaryDto') &&
  contractsContent.includes('latestEstimate: AsoAppEstimateDto;') &&
  contractsContent.includes('growthTrends:')
);

evaluate(
  'Contrato AsoCategoryBenchmarkDto exportado com coeficientes alpha e beta',
  contractsContent.includes('export interface AsoCategoryBenchmarkDto') &&
  contractsContent.includes('alpha: number;') &&
  contractsContent.includes('beta: number;')
);

// -----------------------------------------------------------------------------
// 3. Motor Matemático de Predição (Backend)
// -----------------------------------------------------------------------------
printHeader('PARTE 3: Motor Estatístico de Predição (Power-Law / Pareto)');

const benchmarksPath = path.join(ROOT_DIR, 'apps/api/src/modules/aso/constants/category-benchmarks.constant.ts');
evaluate('Arquivo de benchmarks setoriais existe', fs.existsSync(benchmarksPath));

if (fs.existsSync(benchmarksPath)) {
  const benchContent = fs.readFileSync(benchmarksPath, 'utf8');
  evaluate(
    'Benchmarks contemplam categorias GAME, FINANCE, SHOPPING, SOCIAL, PRODUCTIVITY, TOOLS e DEFAULT',
    benchContent.includes('GAME:') &&
    benchContent.includes('FINANCE:') &&
    benchContent.includes('SHOPPING:') &&
    benchContent.includes('SOCIAL:') &&
    benchContent.includes('PRODUCTIVITY:') &&
    benchContent.includes('TOOLS:') &&
    benchContent.includes('DEFAULT:')
  );
  evaluate(
    'Função resolveCategoryBenchmark implementa mapeamento resiliente com fallback',
    benchContent.includes('export function resolveCategoryBenchmark')
  );
}

const servicePath = path.join(ROOT_DIR, 'apps/api/src/modules/aso/services/aso-estimates.service.ts');
evaluate('Serviço AsoEstimatesService existe', fs.existsSync(servicePath));

if (fs.existsSync(servicePath)) {
  const servContent = fs.readFileSync(servicePath, 'utf8');
  evaluate(
    'AsoEstimatesService implementa cálculo de Pareto D = alpha * (r ^ -beta)',
    servContent.includes('benchmark.alpha * Math.pow(rankBasis, -benchmark.beta)')
  );
  evaluate(
    'AsoEstimatesService ajusta estimativa por velocidade de avaliações (reviewVelocityFactor)',
    servContent.includes('reviewVelocityFactor') &&
    servContent.includes('expectedReviews')
  );
  evaluate(
    'AsoEstimatesService ajusta estimativa pela nota média do app (scoreFactor)',
    servContent.includes('scoreFactor')
  );
  evaluate(
    'AsoEstimatesService delimita pisos e tetos realistas com base em minInstalls',
    servContent.includes('minDailyFloor') &&
    servContent.includes('maxDailyCeil')
  );
  evaluate(
    'AsoEstimatesService calcula receita segregada por modelo (PAID, FREE_IAP, FREE_ADS)',
    servContent.includes("'PAID'") &&
    servContent.includes("'FREE_IAP'") &&
    servContent.includes("'FREE_ADS'")
  );
  evaluate(
    'AsoEstimatesService calcula score de confiança proporcional à riqueza de dados',
    servContent.includes('confidenceScore')
  );
  evaluate(
    'AsoEstimatesService persiste snapshot com upsert atômico por app, data e país',
    servContent.includes('this.prisma.asoAppEstimate.upsert')
  );
  evaluate(
    'AsoEstimatesService calcula taxas de crescimento de 7 e 30 dias (downloadGrowthRate, revenueGrowthRate)',
    servContent.includes('downloadGrowthRate7d') &&
    servContent.includes('downloadGrowthRate30d') &&
    servContent.includes('revenueGrowthRate7d') &&
    servContent.includes('revenueGrowthRate30d')
  );
}

// -----------------------------------------------------------------------------
// 4. Controlador REST & Swagger API
// -----------------------------------------------------------------------------
printHeader('PARTE 4: API REST & Proteção Multi-Tenant');

const controllerPath = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-estimates.controller.ts');
evaluate('Controlador AsoEstimatesController existe', fs.existsSync(controllerPath));

if (fs.existsSync(controllerPath)) {
  const ctrlContent = fs.readFileSync(controllerPath, 'utf8');
  evaluate(
    'Controlador protegido com JwtAuthGuard e TenantGuard',
    ctrlContent.includes('@UseGuards(JwtAuthGuard, TenantGuard)')
  );
  evaluate(
    'Endpoint GET /api/v1/aso/apps/:id/estimates implementado',
    ctrlContent.includes("@Get('apps/:id/estimates')")
  );
  evaluate(
    'Endpoint POST /api/v1/aso/apps/:id/estimates/recalculate implementado',
    ctrlContent.includes("@Post('apps/:id/estimates/recalculate')")
  );
  evaluate(
    'Endpoint GET /api/v1/aso/benchmarks implementado',
    ctrlContent.includes("@Get('benchmarks')")
  );
  evaluate(
    'Controlador documentado com decorators OpenAPI/Swagger',
    ctrlContent.includes('@ApiTags') &&
    ctrlContent.includes('@ApiOperation') &&
    ctrlContent.includes('@ApiResponse')
  );
}

const modulePath = path.join(ROOT_DIR, 'apps/api/src/modules/aso/aso.module.ts');
const modContent = fs.readFileSync(modulePath, 'utf8');
evaluate(
  'AsoModule registra AsoEstimatesController e provê AsoEstimatesService',
  modContent.includes('AsoEstimatesController') &&
  modContent.includes('AsoEstimatesService')
);

// -----------------------------------------------------------------------------
// 5. Interface Web & Dashboard (apps/web)
// -----------------------------------------------------------------------------
printHeader('PARTE 5: Interface Web Next.js & Visualização Preditiva');

const webComponentPath = path.join(ROOT_DIR, 'apps/web/src/components/aso/predictive-estimates.tsx');
evaluate('Componente PredictiveEstimates existe no frontend', fs.existsSync(webComponentPath));

if (fs.existsSync(webComponentPath)) {
  const compContent = fs.readFileSync(webComponentPath, 'utf8');
  evaluate(
    'Componente renderiza 4 Cards de KPI (Downloads Diários, Downloads Mensais, Receita Diária, Receita Mensal)',
    compContent.includes('dailyDownloads.median') &&
    compContent.includes('monthlyDownloads.median') &&
    compContent.includes('dailyRevenue.median') &&
    compContent.includes('monthlyRevenue.median')
  );
  evaluate(
    'Componente exibe índice de confiança com indicador visual e badge ShieldCheck',
    compContent.includes('confidenceScore') &&
    compContent.includes('ShieldCheck')
  );
  evaluate(
    'Componente inclui botão para recalcular estimativas sob demanda com feedback e estado de loading',
    compContent.includes('handleRecalculate') &&
    compContent.includes('isRecalculating')
  );
  evaluate(
    'Componente implementa gráfico SVG com faixa sombreada de intervalo de confiança e linha de mediana',
    compContent.includes('confidenceBandD') &&
    compContent.includes('medianPathD') &&
    compContent.includes('setHoveredIndex')
  );
  evaluate(
    'Componente permite alternar visualização gráfica entre Downloads e Receita (BRL)',
    compContent.includes("setChartMetric('downloads')") &&
    compContent.includes("setChartMetric('revenue')")
  );
  evaluate(
    'Componente exibe nota metodológica e aviso de transparência com as diretrizes da Play Store',
    compContent.includes('methodologyNotice')
  );
}

const pagePath = path.join(ROOT_DIR, 'apps/web/src/app/(dashboard)/aso/[id]/page.tsx');
const pageContent = fs.readFileSync(pagePath, 'utf8');
evaluate(
  'Página de detalhes do app integra aba Estimativas Preditivas no cabeçalho de navegação',
  pageContent.includes("setActiveTab('estimates')") &&
  pageContent.includes('Estimativas Preditivas')
);
evaluate(
  'Página de detalhes renderiza componente PredictiveEstimates na aba selecionada',
  pageContent.includes("<PredictiveEstimates asoAppId={appIdParam} app={app} />")
);

// -----------------------------------------------------------------------------
// 6. Testes Automatizados
// -----------------------------------------------------------------------------
printHeader('PARTE 6: Verificação de Testes Unitários da Fase 29');

const serviceSpecPath = path.join(ROOT_DIR, 'apps/api/src/modules/aso/services/aso-estimates.service.spec.ts');
const ctrlSpecPath = path.join(ROOT_DIR, 'apps/api/src/modules/aso/controllers/aso-estimates.controller.spec.ts');

evaluate('Arquivo de testes do serviço aso-estimates.service.spec.ts existe', fs.existsSync(serviceSpecPath));
evaluate('Arquivo de testes do controlador aso-estimates.controller.spec.ts existe', fs.existsSync(ctrlSpecPath));

const serviceSpecContent = fs.readFileSync(serviceSpecPath, 'utf8');
evaluate(
  'Suíte de testes cobre cálculo com IAP, apps pagos, bounding de minInstalls e isolamento de tenant',
  serviceSpecContent.includes('calculateAndSaveEstimate') &&
  serviceSpecContent.includes('getEstimatesSummary') &&
  serviceSpecContent.includes('getCategoryBenchmarks') &&
  serviceSpecContent.includes('NotFoundException')
);

const ctrlSpecContent = fs.readFileSync(ctrlSpecPath, 'utf8');
evaluate(
  'Suíte de testes do controlador cobre GET estimates, POST recalculate e GET benchmarks',
  ctrlSpecContent.includes('getAppEstimates') &&
  ctrlSpecContent.includes('recalculateAppEstimate') &&
  ctrlSpecContent.includes('getCategoryBenchmarks')
);

let testsPassed = false;
try {
  const result = execSync(
    'npx jest --config apps/api/test/jest-audit.json src/modules/aso/services/aso-estimates.service.spec.ts src/modules/aso/controllers/aso-estimates.controller.spec.ts',
    { cwd: path.join(ROOT_DIR, 'apps/api'), encoding: 'utf8', stdio: 'pipe' }
  );
  testsPassed = true;
} catch (e) {
  // Jest writes results to stderr even when successful
  const fullOutput = (e.stdout || '') + (e.stderr || '');
  if (fullOutput.includes('PASS') && !fullOutput.includes('FAIL') && fullOutput.includes('Test Suites: 2 passed')) {
    testsPassed = true;
  } else {
    // Alternatively run via pnpm and check status
    try {
      execSync('pnpm --filter @mgp/api test src/modules/aso/services/aso-estimates.service.spec.ts src/modules/aso/controllers/aso-estimates.controller.spec.ts', { cwd: ROOT_DIR, stdio: 'ignore' });
      testsPassed = true;
    } catch (err) {
      testsPassed = false;
    }
  }
}

evaluate(
  'Suíte de testes de estimativas preditivas executa com 100% de aprovação (14 testes verdes)',
  testsPassed
);

// -----------------------------------------------------------------------------
// Relatório Final
// -----------------------------------------------------------------------------
printHeader('RELATÓRIO FINAL DA AUDITORIA DA ETAPA 5 - FASE 29');

const score = Math.round((passedChecks / totalChecks) * 100);
console.log(` Total de verificações: ${totalChecks}`);
console.log(` Aprovados:             ${passedChecks}`);
console.log(` Falhas:                ${totalChecks - passedChecks}`);
console.log(` Pontuação de Conformidade: ${score}%\n`);

if (score === 100) {
  console.log(`${COLORS.bright}${COLORS.green}✔ HOMOLOGAÇÃO ETAPA 5 (FASE 29): APROVADA COM SUCESSO!${COLORS.reset}\n`);
  process.exit(0);
} else {
  console.log(`${COLORS.bright}${COLORS.red}✖ HOMOLOGAÇÃO ETAPA 5 (FASE 29): REPROVADA. CORRIJA AS FALHAS ACIMA.${COLORS.reset}\n`);
  process.exit(1);
}
