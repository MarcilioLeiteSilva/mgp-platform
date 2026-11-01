# 03. Stack Tecnológica Oficial e Padrões de Projeto

## 1. Stack Tecnológica Homologada

| Camada | Tecnologia | Versão Mínima | Justificativa |
| :--- | :--- | :--- | :--- |
| **Monorepo Manager** | Turborepo + pnpm | pnpm 9.x / Turbo 2.x | Builds paralelos rápidos com cache remoto de compilação. |
| **Linguagem Base** | TypeScript / Node.js | TS 5.4+ / Node 20 LTS | Tipagem estrita ponta a ponta e suporte corporativo de longo prazo. |
| **Backend Framework** | NestJS | 10.x | Arquitetura modular robusta baseada em injeção de dependência e facilidade de testes. |
| **Frontend Framework** | Next.js (App Router) | 14.x / 15.x | Server-Side Rendering (SSR), alta performance de renderização e SEO. |
| **Estilização & UI** | Tailwind CSS + Radix UI | Tailwind 3.4+ / shadcn | Componentes desacoplados, acessíveis e altamente customizáveis sem overhead de runtime. |
| **ORM & Migrations** | Prisma ORM | 5.x | Tipagem automática integrada ao TypeScript e gerenciamento confiável de schema. |
| **Banco Principal** | PostgreSQL | 16.x | Integridade ACID comprovada, suporte a JSONB e particionamento declarativo. |
| **Cache & Filas** | Redis + BullMQ | Redis 7.x / BullMQ 5.x | Controle de latência < 2ms para pacing de anúncios e enfileiramento resiliente. |
| **Analytics Massivo** | ClickHouse | 24.x (Fase analítica) | Banco colunar de altíssima taxa de compressão para bilhão de eventos de telemetria. |
| **SDK Nativo** | Kotlin (Android) | Kotlin 1.9+ (API 24+) | Padrão da plataforma Android moderno com suporte nativo a Coroutines. |
| **SDK Cross-Platform**| Flutter (Dart) | Flutter 3.19+ | Plugin oficial cobrindo a comunidade móvel multiplataforma. |
| **Infraestrutura & Deploy**| Docker + EasyPanel | EasyPanel 2.x / Compose | Deploy contínuo ágil baseado em containers em servidor Hostinger VPS. |

---

## 2. Padrões de Nomenclatura

Para garantir consistência em toda a base de código, os seguintes padrões são normativos:

### 2.1. Arquivos e Diretórios
* **Diretórios e arquivos:** `kebab-case`
  * Exemplos: `user-profile.controller.ts`, `ad-unit-card.tsx`, `auth-service/`.
* **Módulos NestJS:** `[nome].module.ts`, `[nome].service.ts`, `[nome].controller.ts`.
* **Componentes React/Next.js:** Arquivos em `kebab-case` (ex: `button-primary.tsx`), mas o componente exportado nomeado em `PascalCase` (`export function ButtonPrimary() {}`).

### 2.2. Código (TypeScript)
* **Classes, Interfaces, Tipos e Enums:** `PascalCase`
  * Exemplos: `CreateCampaignDto`, `AdFormatEnum`, `WalletLedgerEntry`.
* **Variáveis, Funções e Métodos:** `camelCase`
  * Exemplos: `calculateEcpm()`, `activeCampaignId`, `validateImpressionToken()`.
* **Constantes Globais:** `UPPER_SNAKE_CASE`
  * Exemplos: `MAX_IMPRESSION_TOKEN_TTL_MS`, `DEFAULT_PAGE_SIZE`.

### 2.3. Banco de Dados (PostgreSQL / Prisma)
* **Modelos no Prisma:** `PascalCase` no schema (ex: `model PublisherAccount { ... }`).
* **Mapeamento físico no banco:** `snake_case` com plural explícito.
  * Tabela: `@@map("publisher_accounts")`.
  * Colunas: `@map("organization_id")`, `@map("created_at")`.
* **Chaves Primárias:** Sempre UUID v4 gerado no banco (`id String @id @default(uuid())`).
* **Timestamps:** Obrigatoriamente `created_at` e `updated_at` com `@default(now())` e `@updatedAt`.

---

## 3. Padrões Git e Fluxo de Branches

### 3.1. Convenção de Branches
* `main`: Código pronto para produção (espelhado no ambiente de produção).
* `staging`: Código integrado e pronto para homologação e auditoria técnica.
* `feature/<fase-xx>-<resumo>`: Branches de desenvolvimento de cada fase do roadmap.
  * Exemplo: `feature/fase-01-docs`, `feature/fase-04-nestjs-bootstrap`.
* `fix/<resumo>`: Correções pontuais de bugs identificados na auditoria.

### 3.2. Padrão de Commits (Conventional Commits)
Cada mensagem de commit deve seguir a estrutura:
`<tipo>(<escopo>): <descrição no imperativo>`

Tipos permitidos:
* `feat`: Nova funcionalidade concluída.
* `fix`: Correção de um bug.
* `docs`: Alterações ou adições na documentação técnica.
* `refactor`: Refatoração interna de código que não altera comportamento público.
* `test`: Adição ou ajuste de suítes de testes unitários ou de integração.
* `chore`: Mudanças em dependências, scripts de build ou configurações gerais.

Exemplos:
```bash
feat(ad-server): implement signed impression token verification
docs(architecture): add multi-tenancy and ledger specification
test(wallet): add double-entry ledger balance integrity tests
```

