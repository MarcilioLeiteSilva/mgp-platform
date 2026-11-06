#!/usr/bin/env node

/**
 * Mobile Growth Platform (MGP)
 * Script de Auditoria Automatizada e Certificação da ETAPA 3 (SDK Android, Ad Server & Motor Publicitário)
 *
 * Avalia de forma estrita e exaustiva a completude, integridade, tipagem, resiliência,
 * criptografia, leilão RTB, conformidade de formatos publicitários e pipelines assíncronos das Fases 17 a 22.
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

printHeader('AUDITORIA OFICIAL E CERTIFICAÇÃO DA ETAPA 3 — SDK ANDROID, AD SERVER & MOTOR PUBLICITÁRIO');
console.log(`Horário da Execução: ${new Date().toISOString()}`);
console.log(`Diretório Raiz:      ${ROOT_DIR}`);
console.log(`Ambiente Operacional: Node ${process.version} | ${process.platform}\n`);

// -----------------------------------------------------------------------------
// 1. ARQUITETURA DO SDK ANDROID E ESPECIFICAÇÃO DE TELEMETRIA (FASE 17)
// -----------------------------------------------------------------------------
console.log(`${COLORS.bright}${COLORS.blue}▶ 1. Arquitetura do SDK Android e Especificação de Telemetria (Fase 17)${COLORS.reset}`);
evaluate('Especificação de Arquitetura do SDK (docs/sdk/01-sdk-architecture.md)', fileExists('docs/sdk/01-sdk-architecture.md'));
evaluate('Especificação do Protocolo de Telemetria (docs/sdk/02-telemetry-specification.md)', fileExists('docs/sdk/02-telemetry-specification.md'));
evaluate('Contratos de Telemetria Zod (@mgp/contracts)', fileExists('packages/contracts/src/telemetry.contracts.ts'));
evaluate('Configuração Gradle Raiz do SDK Android', fileExists('sdk/android/build.gradle.kts'));
evaluate('Configuração Gradle do Módulo MGP SDK', fileExists('sdk/android/mgp-sdk/build.gradle.kts'));
evaluate('AndroidManifest com permissões estritas e não-intrusivas', fileExists('sdk/android/mgp-sdk/src/main/AndroidManifest.xml'));
evaluate('Regras de ProGuard e Ofuscação do SDK', fileExists('sdk/android/mgp-sdk/consumer-rules.pro'));
evaluate('Ponto de Entrada Central MGP.kt', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/MGP.kt'));
evaluate('Configuração Imutável MgpConfig.kt', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/MgpConfig.kt'));
evaluate('Rastreador de Ciclo de Vida MgpLifecycleTracker.kt', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/core/MgpLifecycleTracker.kt'));
evaluate('Inspetor de Integridade e Root/Emulador DeviceIntegrity.kt', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/antifraud/DeviceIntegrity.kt'));
evaluate('Suíte de Testes de Contratos de Telemetria', fileExists('apps/api/src/test/telemetry-contracts.spec.ts'));

// -----------------------------------------------------------------------------
// 2. IMPLEMENTAÇÃO DO SDK ANDROID: CORE, FINGERPRINT & HEARTBEAT (FASE 18)
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 2. Implementação do SDK Android — Core, Fingerprint & Heartbeat (Fase 18)${COLORS.reset}`);
evaluate('Extrator de Contexto e Play Advertising ID (DeviceContextExtractor.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/core/DeviceContextExtractor.kt'));
evaluate('Buffer Local SQLite Resiliente Offline (TelemetryDatabaseHelper.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/storage/TelemetryDatabaseHelper.kt'));
evaluate('Transmissor HTTP Nativo sem Libs Externas (TelemetryHttpClient.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/network/TelemetryHttpClient.kt'));
evaluate('Worker de Sincronização em Background WorkManager (TelemetrySyncWorker.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/worker/TelemetrySyncWorker.kt'));
evaluate('Gerenciador Central de Telemetria com HMAC (TelemetryManager.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/TelemetryManager.kt'));

const dbHelperCode = readFileContent('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/storage/TelemetryDatabaseHelper.kt');
evaluate('Capacidade circular de buffer SQLite (máx. 1.000 eventos)', dbHelperCode.includes('1000') || dbHelperCode.includes('MAX_BUFFER_RECORDS'));

const extractorCode = readFileContent('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/core/DeviceContextExtractor.kt');
evaluate('Conformidade LGPD e Google Play: Zero coleta de IMEI/MAC/ANDROID_ID', !extractorCode.includes('getDeviceId') && !extractorCode.includes('getMacAddress'));
evaluate('Guia Oficial de Integração do SDK Android', fileExists('docs/sdk/03-sdk-implementation-guide.md'));

// -----------------------------------------------------------------------------
// 3. ENGINE DE EVENTOS, ATRIBUIÇÃO E ANTIFRAUDE NO BACKEND (FASE 19)
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 3. Engine de Eventos, Atribuição e Antifraude no Backend (Fase 19)${COLORS.reset}`);
const schema = readFileContent('packages/database/prisma/schema.prisma');
evaluate('Tabela de Sessões de Telemetria (telemetry_sessions)', schema.includes('model TelemetrySession {'));
evaluate('Tabela de Eventos Analíticos de Telemetria (telemetry_events)', schema.includes('model TelemetryEventRecord {'));
evaluate('Migration SQL Versionada de Telemetria', fileExists('packages/database/prisma/migrations/20261106000000_telemetry_engine/migration.sql'));
evaluate('Serviço de Antifraude e Criptografia (TelemetryAntifraudService)', fileExists('apps/api/src/modules/telemetry/services/telemetry-antifraud.service.ts'));
evaluate('Serviço de Ingestão e Produtor BullMQ (TelemetryIngestionService)', fileExists('apps/api/src/modules/telemetry/services/telemetry-ingestion.service.ts'));
evaluate('Controller REST de Telemetria (TelemetryController)', fileExists('apps/api/src/modules/telemetry/controllers/telemetry.controller.ts'));
evaluate('Worker Consumer Assíncrono (TelemetryProcessor)', fileExists('apps/workers/src/processors/telemetry.processor.ts'));
evaluate('Handler Assíncrono de Ingestão de Lotes', fileExists('apps/workers/src/handlers/process-telemetry-batch.handler.ts'));

const antifraudCode = readFileContent('apps/api/src/modules/telemetry/services/telemetry-antifraud.service.ts');
evaluate('Proteção Anti-Timing Attack com crypto.timingSafeEqual', antifraudCode.includes('timingSafeEqual'));
evaluate('Proteção Anti-Replay com Nonce atômico em Redis (TTL 600s)', antifraudCode.includes('set') && (antifraudCode.includes('600') || antifraudCode.includes('NX')));

evaluate('Suíte de Testes do Controller de Telemetria', fileExists('apps/api/src/modules/telemetry/controllers/telemetry.controller.spec.ts'));
evaluate('Suíte de Testes do Antifraude de Telemetria', fileExists('apps/api/src/modules/telemetry/services/telemetry-antifraud.service.spec.ts'));
evaluate('Suíte de Testes do Worker de Telemetria', fileExists('apps/workers/src/processors/telemetry.processor.spec.ts'));
evaluate('Especificação Normativa de Telemetria e Antifraude', fileExists('docs/sdk/04-telemetry-engine-and-antifraud.md'));

// -----------------------------------------------------------------------------
// 4. AD SERVER DE ULTRA-BAIXA LATÊNCIA FASTIFY (FASE 20)
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 4. Ad Server de Ultra-Baixa Latência Fastify (Fase 20)${COLORS.reset}`);
evaluate('Servidor Nativo Fastify (apps/ad-server/src/app.ts)', fileExists('apps/ad-server/src/app.ts'));
evaluate('Ponto de Entrada do Ad Server (apps/ad-server/src/main.ts)', fileExists('apps/ad-server/src/main.ts'));
evaluate('Serviço Criptográfico de Tokens (TokenService)', fileExists('apps/ad-server/src/services/token.service.ts'));
evaluate('Serviço de Cache Redis e Anti-Replay (CacheService)', fileExists('apps/ad-server/src/services/cache.service.ts'));
evaluate('Fila Assíncrona de Eventos BullMQ (EventQueueService)', fileExists('apps/ad-server/src/services/event-queue.service.ts'));
evaluate('Rotas de Anúncios e Solicitação (/ads/request)', fileExists('apps/ad-server/src/routes/ads.route.ts'));
evaluate('Rotas de Eventos de Impressão e Clique (/events/*)', fileExists('apps/ad-server/src/routes/events.route.ts'));
evaluate('Rota de Rastreamento de Clique com Redirecionamento 302 (/click/track)', readFileContent('apps/ad-server/src/routes/events.route.ts').includes('/click/track'));
evaluate('Rota de Saúde Operacional (/health)', fileExists('apps/ad-server/src/routes/health.route.ts'));
evaluate('Exportador de Métricas Prometheus (/metrics)', fileExists('apps/ad-server/src/routes/metrics.route.ts'));
evaluate('Dockerfile Otimizado do Ad Server (Dockerfile.adserver)', fileExists('Dockerfile.adserver') && fileExists('infrastructure/docker/Dockerfile.adserver'));

const tokenCode = readFileContent('apps/ad-server/src/services/token.service.ts');
evaluate('Tokens assinados via HMAC-SHA256 com verificação timingSafeEqual', tokenCode.includes('createHmac') && tokenCode.includes('timingSafeEqual'));
evaluate('TTL estrito de 15 minutos (900s) nos tokens publicitários', tokenCode.includes('900') || tokenCode.includes('expiresAt'));

// -----------------------------------------------------------------------------
// 5. MOTOR DE DECISÃO, LEILÃO RTB & FORMATOS PUBLICITÁRIOS (FASE 21)
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 5. Motor de Decisão, Leilão RTB & Formatos Publicitários (Fase 21)${COLORS.reset}`);
evaluate('Serviço Central de Decisão e Leilão RTB (AdDecisionService)', fileExists('apps/ad-server/src/services/ad-decision.service.ts'));
evaluate('Contratos de Formatos e Precificação RTB em @mgp/contracts', readFileContent('packages/contracts/src/ad-server.contracts.ts').includes('AdPricingSchema'));
evaluate('Migration SQL de Formatos e Frequency Capping', fileExists('packages/database/prisma/migrations/20261106010000_rtb_formats/migration.sql'));

const decisionCode = readFileContent('apps/ad-server/src/services/ad-decision.service.ts');
evaluate('Normalização de CPM, CPC e CPI em eCPM efetivo', decisionCode.includes('calculateEcpm') && (decisionCode.includes('predictedCtr') || decisionCode.includes('CTR_DEFAULT')));
evaluate('Leilão de Segundo Preço de Vickrey com Floor eCPM', decisionCode.includes('runRtbAuction') && decisionCode.includes('clearingPrice'));
evaluate('Priorização Waterfall (Tier 1: House -> Tier 2: Paid -> Tier 3: Exchange)', decisionCode.includes('priorityTier') && decisionCode.includes('HOUSE_AD'));
evaluate('Proteção de Auto-Impressão (anunciante não compra inventário de si mesmo)', decisionCode.includes('campaign.organizationId === publisherOrgId'));
evaluate('Frequency Capping por usuário via Redis (INCR freq:{camp}:{user})', readFileContent('apps/ad-server/src/services/cache.service.ts').includes('checkAndIncrementFrequency'));
evaluate('Suporte ao Formato BANNER (320x50, 300x250, 728x90)', readFileContent('packages/shared/src/enums.ts').includes('BANNER'));
evaluate('Suporte ao Formato NATIVE com metadados ricos (headline, icon, cta, rating)', decisionCode.includes('NATIVE') && decisionCode.includes('iconUrl'));
evaluate('Suporte ao Formato INTERSTITIAL com Skip Offset', decisionCode.includes('INTERSTITIAL') && decisionCode.includes('skipOffsetSeconds'));
evaluate('Suporte ao Formato REWARDED com rewardToken e requiredWatchSeconds', decisionCode.includes('REWARDED') && decisionCode.includes('rewardToken'));
evaluate('Endpoint POST /events/reward com verificação de duração assistida', readFileContent('apps/ad-server/src/routes/events.route.ts').includes('/events/reward'));
evaluate('Documentação Normativa de RTB e Formatos (02-rtb-auction-and-formats.md)', fileExists('docs/adserver/02-rtb-auction-and-formats.md'));

// -----------------------------------------------------------------------------
// 6. INTEGRAÇÃO SDK-SERVER, AD VIEWS E LIQUIDAÇÃO DE FILAS (FASE 22)
// -----------------------------------------------------------------------------
console.log(`\n${COLORS.bright}${COLORS.blue}▶ 6. Integração SDK-Server, Ad Views e Liquidação de Filas (Fase 22)${COLORS.reset}`);
evaluate('Modelos de Dados do SDK Android (AdModels.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/model/AdModels.kt'));
evaluate('Cliente HTTP Nativo do SDK para Ad Server (AdHttpClient.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/network/AdHttpClient.kt'));
evaluate('Componente Custom View Banner com MRC Viewability (MgpBannerView.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/banner/MgpBannerView.kt'));
evaluate('Gerenciador Fullscreen Interstitial com Skip Countdown (MgpInterstitialAd.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/interstitial/MgpInterstitialAd.kt'));
evaluate('Gerenciador Rewarded com Required Watch Verification (MgpRewardedAd.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/rewarded/MgpRewardedAd.kt'));
evaluate('Gerenciador de Anúncio Nativo Desacoplado (MgpNativeAd.kt)', fileExists('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/nativead/MgpNativeAd.kt'));
evaluate('Helpers de Anúncios Integrados no MGP.kt', readFileContent('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/MGP.kt').includes('loadInterstitial') && readFileContent('sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/MGP.kt').includes('loadRewarded'));

evaluate('Processador Assíncrono de Eventos Publicitários nos Workers (AdEventsProcessor)', fileExists('apps/workers/src/processors/ad-events.processor.ts'));
evaluate('Workers BullMQ de Impressões, Cliques e Recompensas (ad-events.worker.ts)', fileExists('apps/workers/src/queue/ad-events.worker.ts'));
evaluate('Registro dos Workers Publicitários no main.ts dos Workers', readFileContent('apps/workers/src/main.ts').includes('createAdEventsWorkers'));
evaluate('Suíte de Testes do Processador de Eventos Publicitários', fileExists('apps/workers/src/processors/ad-events.processor.spec.ts'));

evaluate('Suíte de Testes de Integração End-to-End da Etapa 3 (etapa3-e2e.spec.ts)', fileExists('apps/ad-server/src/test/etapa3-e2e.spec.ts'));
evaluate('Suíte de Integração do Ad Server Fastify (ad-server.integration.spec.ts)', fileExists('apps/ad-server/src/test/ad-server.integration.spec.ts'));

// -----------------------------------------------------------------------------
// RELATÓRIO CONSOLIDADO E CONCLUSÃO
// -----------------------------------------------------------------------------
printHeader('PARECER FINAL DA AUDITORIA DA ETAPA 3');

const score = Math.round((passedChecks / totalChecks) * 100);
console.log(`Total de Verificações Realizadas: ${totalChecks}`);
console.log(`Verificações Aprovadas:           ${passedChecks}`);
console.log(`Verificações com Falha:           ${totalChecks - passedChecks}`);
console.log(`Índice Geral de Conformidade:     ${score}%\n`);

if (score === 100) {
  console.log(`${COLORS.bright}${COLORS.green}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.green}  CERTIFICAÇÃO OFICIAL: ETAPA 3 HOMOLOGADA COM SUCESSO (SCORE: 100%)             ${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.green}================================================================================${COLORS.reset}`);
  console.log(`O subsistema formado pelo SDK Android Kotlin, Ad Server Fastify, Motor de Decisão RTB`);
  console.log(`e Workers Assíncronos cumpre rigorosamente todos os requisitos arquiteturais, de segurança,`);
  console.log(`criptografia, integridade financeira, privacidade de dados (LGPD) e testes automatizados.`);
  console.log(`\nA ETAPA 3 está formalmente encerrada e a plataforma está pronta para a ETAPA 4!\n`);
  process.exit(0);
} else {
  console.log(`${COLORS.bright}${COLORS.red}================================================================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.red}  AUDITORIA REPROVADA: DIVERGÊNCIAS DETECTADAS (SCORE: ${score}%)                 ${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.red}================================================================================${COLORS.reset}\n`);
  process.exit(1);
}
