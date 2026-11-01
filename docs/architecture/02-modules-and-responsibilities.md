# 02. Definição de Módulos e Responsabilidades

O ecossistema **MGP (Mobile Growth Platform)** é organizado em um Monorepo gerenciado por workspaces. Cada componente possui fronteiras bem delimitadas para evitar acoplamento nocivo.

---

## 1. Aplicações (`apps/`)

### 1.1. `apps/api` (Core Backend REST)
* **Tecnologia:** NestJS + TypeScript.
* **Função:** Fornecer a API central para o Dashboard do cliente, gerenciamento institucional e operações transacionais.
* **Módulos Internos:**
  * `AuthModule`: Registro, autenticação local, recuperação de conta e emissão de JWT.
  * `OrganizationsModule`: Multi-tenancy, membros da organização, convites e controle de permissões (RBAC).
  * `AppsModule`: Cadastro de aplicativos móveis (Android), gerenciamento de chaves de SDK e configurações de inventário.
  * `AsoModule`: Catálogo de apps públicos, busca de palavras-chave, rankings de categorias e análise de concorrentes.
  * `CampaignsModule`: Criação, configuração de targeting, criativos e orçamentos de campanhas pagas, de troca e house ads.
  * `WalletModule`: Visualização de saldos, depósitos, solicitação de saques e extrato detalhado do razão contábil (ledger).
  * `HealthModule`: Endpoints `/health/liveness` e `/health/readiness` para orquestração e monitoramento.

### 1.2. `apps/ad-server` (Motor de Entrega e Leilão de Anúncios)
* **Tecnologia:** NestJS / Fastify de alta performance.
* **Função:** Atendimento em tempo real das requisições originadas pelo SDK móvel com latência estrita (< 80ms).
* **Responsabilidades:**
  * Endpoint `/ads/request`: Validação do `ad_unit_id`, verificação do status da organização publisher, filtragem de campanhas elegíveis por país, categoria e formato.
  * Resolução de prioridade de distribuição: **Campanha Paga (maior eCPM) vs. Troca de Anúncios (Exchange) vs. House Ads (Fallback)**.
  * Geração de tokens de rastreamento assinados criptograficamente (`impression_token`, `click_token`).
  * Endpoint de recepção de telemetria `/events/*`: Deduplicação por nonce e publicação rápida em filas Redis.

### 1.3. `apps/workers` (Processamento em Segundo Plano)
* **Tecnologia:** NestJS + BullMQ + TypeScript.
* **Função:** Execução de tarefas assíncronas agendadas e orientadas a eventos.
* **Processadores (Queues):**
  * `queue-telemetry`: Consome eventos brutos de impressões e cliques do Redis, valida integridade e persiste em lotes analíticos.
  * `queue-ledger`: Executa débitos de orçamento de anunciantes e créditos aos publishers de forma transacional e idempotente.
  * `queue-aso-sync`: Cron jobs periódicos para atualização de rankings da Google Play brasileira e métricas públicas de apps catalogados.
  * `queue-fraud`: Análise de anomalias (taxas anormais de CTR, repetição excessiva de IP/dispositivo) e bloqueio temporário de inventários suspeitos.

### 1.4. `apps/web` (Dashboard do Desenvolvedor / Publisher / Anunciante)
* **Tecnologia:** Next.js (App Router), React, Tailwind CSS, shadcn/ui.
* **Função:** Portal principal voltado aos usuários e clientes.
* **Seções:**
  * Painel de Visão Geral (Resumo de tráfego, saldo de créditos e faturamento).
  * Hub de Inteligência (Busca na Google Play, Top Rankings e ASO Studio).
  * Ad Network (Configuração de blocos de anúncios, gestão de campanhas e criativos).
  * Carteira & Finanças (Comprar créditos, configurar divisão de inventário, solicitar repasses).
  * Gestão da Organização (Membros, papéis e chaves de API).

### 1.5. `apps/admin` (Backoffice Global da Plataforma)
* **Tecnologia:** Next.js (App Router).
* **Função:** Painel restrito aos operadores e engenheiros da MGP (NOC).
* **Recursos:**
  * Auditoria global de usuários e organizações.
  * Moderação e aprovação de novos publishers e criativos publicitários.
  * Controle de fraude, bloqueio manual de contas e revisão de transações retidas.
  * Painel de saúde de infraestrutura (taxas de requisição, filas pendentes, latência de entrega).

---

## 2. Pacotes Compartilhados (`packages/`)

### 2.1. `packages/contracts`
* Contratos agnósticos de entrada e saída (DTOs) com validação Zod.
* Garante tipagem estrita e idêntica entre o backend (`apps/api`), o frontend (`apps/web`) e o motor publicitário (`apps/ad-server`).

### 2.2. `packages/database`
* Contém o `schema.prisma`, arquivos de migrations versionadas e instâncias singleton do PrismaClient.
* Encapsula middlewares de multi-tenancy e extensões de auditoria.

### 2.3. `packages/shared`
* Tipos utilitários globais, constantes do sistema (Enums de campanhas, formatos de anúncios, papéis RBAC).
* Utilitários de criptografia (geração e verificação de tokens HMAC com chaves simétricas).

### 2.4. `packages/config`
* Schemas de validação de variáveis de ambiente (`.env`) via Zod com fail-fast no início da aplicação.

---

## 3. Kits de Desenvolvimento Móvel (`sdk/`)

### 3.1. `sdk/android`
* **Linguagem:** Kotlin.
* **Características:**
  * Mínima pegada de memória e dependências externas reduzidas.
  * Gerenciamento de ciclo de vida de views (Banner e Native View).
  * Medição estrita de visibilidade do anúncio antes de disparar o evento de impressão.
  * Enfileiramento offline com SQLite/Room para eventos de telemetria em caso de oscilação de rede.

### 3.2. `sdk/flutter`
* **Linguagem:** Dart + Platform Channels.
* **Características:**
  * Wrapper oficial sobre o `sdk/android` garantindo paridade de recursos para desenvolvedores Flutter.
  * Componentes visuais (`MgpBannerWidget`, `MgpNativeAdWidget`) prontos para inserção na árvore de widgets.

