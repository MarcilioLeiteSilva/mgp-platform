# Mobile Growth Platform (MGP) — Especificação Técnica Oficial

Bem-vindo à documentação técnica e arquitetural da **Mobile Growth Platform (MGP)**. Este repositório de documentos é a referência normativa para o desenvolvimento, implantação, segurança e governança de todo o ecossistema MGP.

---

## 1. Estrutura da Documentação

### 1.1. Fase 01 — Fundação Documental
| Entregável | Documento de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Arquitetura Geral** | [`docs/architecture/01-general-architecture.md`](./architecture/01-general-architecture.md) | Topologia do sistema, fluxo de dados ponta a ponta e ciclo de vida dos componentes. |
| **02. Módulos & Responsabilidades** | [`docs/architecture/02-modules-and-responsibilities.md`](./architecture/02-modules-and-responsibilities.md) | Divisão de apps (`api`, `ad-server`, `workers`, `web`, `admin`), packages e SDKs. |
| **03. Stack & Convenções** | [`docs/architecture/03-tech-stack-and-standards.md`](./architecture/03-tech-stack-and-standards.md) | Tecnologias oficiais, padrões de código, convenções de commits, pastas e nomenclatura. |
| **04. Estratégia Multi-Tenant & RBAC** | [`docs/architecture/04-multi-tenancy-strategy.md`](./architecture/04-multi-tenancy-strategy.md) | Isolamento lógico por organização, contexto de execução e matriz de papéis/permissões. |
| **05. Padrão de API REST & Eventos** | [`docs/api/01-rest-api-standards.md`](./api/01-rest-api-standards.md) | Convenções RESTful, envelope JSON de respostas, paginação, Swagger e contratos do Ad Server. |
| **06. Modelo de Dados & Ledger Financeiro**| [`docs/database/01-data-model-and-ledger.md`](./database/01-data-model-and-ledger.md) | Esquema relacional central (PostgreSQL/Prisma), razões contábeis (Ledger) e telemetria. |
| **07. Segurança, Antifraude & LGPD** | [`docs/security/01-security-and-antifraud.md`](./security/01-security-and-antifraud.md) | Proteção JWT, rotação de tokens, assinatura de eventos de anúncios, antifraude e compliance Google Play. |
| **08. Logs, Auditoria & Observabilidade** | [`docs/architecture/05-logging-and-observability.md`](./architecture/05-logging-and-observability.md) | Logs estruturados Pino, auditoria de ações, health checks e métricas operacionais Prometheus. |
| **09. Qualidade, Testes & Critérios de Aceite**| [`docs/architecture/06-quality-and-approval-criteria.md`](./architecture/06-quality-and-approval-criteria.md) | Pirâmide de testes, CI/CD, Definition of Done (DoD) e fluxo de auditoria por fase. |

### 1.2. Fase 02 — Ambiente e Infraestrutura
| Entregável | Documento / Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Provisionamento Hostinger VPS & EasyPanel** | [`docs/infrastructure/01-vps-and-easypanel-setup.md`](./infrastructure/01-vps-and-easypanel-setup.md) | Guia de provisionamento, hardening, EasyPanel, DNS e emissão de SSL. |
| **02. Script de Hardening da VPS** | [`infrastructure/scripts/vps-setup.sh`](../infrastructure/scripts/vps-setup.sh) | Script bash automatizado para UFW, Fail2ban, Swap 4GB e sysctl. |
| **03. Docker & Isolamento de Redes** | [`docs/infrastructure/02-docker-and-networks.md`](./infrastructure/02-docker-and-networks.md) | Topologia de rede interna, isolamento de bancos e builds multi-stage. |
| **04. Docker Compose para Desenvolvimento** | [`infrastructure/docker/docker-compose.yml`](../infrastructure/docker/docker-compose.yml) | Stack local com Postgres 16, Redis 7, MinIO e ClickHouse. |
| **05. Dockerfiles de Produção** | [`infrastructure/docker/`](../infrastructure/docker/) | Multi-stage Dockerfiles para `api`, `ad-server`, `workers`, `web` e `admin`. |
| **06. Template do EasyPanel** | [`infrastructure/easypanel/easypanel-template.json`](../infrastructure/easypanel/easypanel-template.json) | Template JSON de serviços, portas e volumes para EasyPanel. |
| **07. Dimensionamento de Recursos** | [`infrastructure/easypanel/service-limits.md`](../infrastructure/easypanel/service-limits.md) | Sizing de CPU/RAM e parâmetros anti-OOM por container. |
| **08. Matriz de Variáveis de Ambiente** | [`docs/infrastructure/03-environments-and-configs.md`](./infrastructure/03-environments-and-configs.md) | Separação entre Dev, Staging e Produção com validação Zod. |
| **09. Arquivos de Ambiente (.env.example)** | [`infrastructure/env/`](../infrastructure/env/) | Exemplos completos de `.env` para Desenvolvimento, Staging e Produção. |
| **10. Política de Backups & Restauração** | [`docs/infrastructure/04-backups-and-resource-limits.md`](./infrastructure/04-backups-and-resource-limits.md) | Scripts de backup e restauração com retenção de 30 dias. |

### 1.3. Fase 03 — Monorepo e Estrutura do Projeto
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Repositório Remoto GitHub** | `https://github.com/MarcilioLeiteSilva/mgp-platform` | Repositório oficial privado criado via GitHub CLI. |
| **02. Monorepo Turborepo + pnpm** | [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) / [`turbo.json`](../turbo.json) | Pipeline de build paralelo, cache inteligente e gestão de dependências. |
| **03. Estrutura de Diretórios** | [`apps/`](../apps/), [`packages/`](../packages/), [`sdk/`](../sdk/) | Apps (`api`, `ad-server`, `workers`, `web`, `admin`) e packages compartilhados. |
| **04. Configuração TypeScript Base** | [`tsconfig.base.json`](../tsconfig.base.json) | Tipagem estrita ponta a ponta com target ES2022. |
| **05. Gerenciamento de Pacotes Raiz** | [`package.json`](../package.json) / [`pnpm-lock.yaml`](../pnpm-lock.yaml) | Scripts de orquestração de compilação, testes, lint e formato. |
| **06. ESLint & Prettier** | [`.eslintrc.json`](../.eslintrc.json) / [`.prettierrc`](../.prettierrc) | Padronização estática de código e formatação automatizada. |
| **07. Convenção de Commits** | [`.commitlintrc.json`](../.commitlintrc.json) | Validação automática de Conventional Commits (`feat:`, `fix:`, etc.). |
| **08. Branches Estruturadas** | Git branches: `main`, `staging`, `develop` | Estratégia de fluxo contínuo de homologação e produção. |
| **09. GitHub Actions Workflows** | [`.github/workflows/`](../.github/workflows/) | CI completo (`ci.yml`) e gatilho de deploy em Staging (`deploy-staging.yml`). |
| **10. Documentação Inicial do Monorepo** | [`README.md`](../README.md) | Guia do desenvolvedor com instruções de inicialização e comandos. |

### 1.4. Fase 04 — Backend Central NestJS
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Bootstrap da Aplicação** | [`apps/api/src/main.ts`](../apps/api/src/main.ts) | Inicialização com CORS, prefixo global `/api/v1` e shutdown hooks. |
| **02. Configuração de Ambiente** | [`apps/api/src/config/`](../apps/api/src/config/) | Serviço `AppConfigService` com validação de runtime via Zod. |
| **03. Filtro Global de Exceções** | [`apps/api/src/common/filters/`](../apps/api/src/common/filters/) | `AllExceptionsFilter` padronizando respostas de erro com envelope normativo. |
| **04. Interceptores de Resposta e Logs** | [`apps/api/src/common/interceptors/`](../apps/api/src/common/interceptors/) | `TransformResponseInterceptor` (`success: true`) e logs estruturados em JSON via `LoggingInterceptor`. |
| **05. Probes de Saúde (HealthModule)** | [`apps/api/src/modules/health/`](../apps/api/src/modules/health/) | Endpoints `/health/liveness` e `/health/readiness` (checando PostgreSQL e Redis). |
| **06. Documentação Swagger/OpenAPI** | Rota `/api/docs` | Swagger 3.0 interativo documentando todas as rotas com autenticação JWT. |
| **07. Conexão de Banco de Dados** | [`apps/api/src/database/`](../apps/api/src/database/) | `PrismaService` singleton integrado com ciclo de vida do NestJS. |
| **08. Esqueletos dos Módulos Centrais**| [`apps/api/src/modules/`](../apps/api/src/modules/) | Módulos `auth`, `users`, `organizations` e `admin` estruturados. |
| **09. Testes Unitários Automatizados** | [`apps/api/src/modules/health/health.controller.spec.ts`](../apps/api/src/modules/health/health.controller.spec.ts) | Suíte de testes Jest com 100% de sucesso. |
| **10. Root Handler Informativo** | [`apps/api/src/app.controller.ts`](../apps/api/src/app.controller.ts) | Rota raiz `/` retornando status online e links de documentação/saúde. |

### 1.5. Fase 05 — Banco de Dados e Modelo Multi-Tenant
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Migration Inicial do PostgreSQL** | [`packages/database/prisma/migrations/`](../packages/database/prisma/migrations/) | Migration DDL estruturando todas as tabelas, enums, índices e chaves estrangeiras. |
| **02. Seed do Banco de Dados** | [`packages/database/prisma/seed.ts`](../packages/database/prisma/seed.ts) | Provisionamento de Superadmin, Master Org, Carteiras, Contas Contábeis, Org Demo e apps. |
| **03. Scripts de Migração e Seed** | [`packages/database/package.json`](../packages/database/package.json) | Comandos `db:migrate` e `db:seed` automatizados no workspace. |
| **04. Contexto e Decorators Multi-Tenant** | [`apps/api/src/common/decorators/`](../apps/api/src/common/decorators/) | `@CurrentTenant()`, `@TenantId()`, `@CurrentUser()` e `@Roles(...)`. |
| **05. Guardião de Isolamento de Tenant** | [`apps/api/src/common/guards/tenant.guard.ts`](../apps/api/src/common/guards/tenant.guard.ts) | Validação de `X-Organization-Id` contra membresia real do usuário logado. |
| **06. Guardião de Papéis RBAC com Hierarquia** | [`apps/api/src/common/guards/roles.guard.ts`](../apps/api/src/common/guards/roles.guard.ts) | Controle de acesso por permissões granulares (`OWNER`, `ADMIN`, `MANAGER`, etc.). |
| **07. Gestão de Organizações e Carteiras** | [`apps/api/src/modules/organizations/`](../apps/api/src/modules/organizations/) | Criação de tenants em transação atômica ACID gerando Carteira com 3 contas. |
| **08. Gestão de Aplicativos (Zero Data Leakage)** | [`apps/api/src/modules/apps/`](../apps/api/src/modules/apps/) | Endpoints multi-tenant com cláusula mandatória `organizationId` e geração de SDK Key. |
| **09. Suíte de Testes de Isolamento Multi-Tenant** | [`apps/api/src/**/*.spec.ts`](../apps/api/src/) | 31 testes unitários e de isolamento automatizados aprovados (6 suítes). |
| **10. Auditoria e Rastreabilidade** | [`apps/api/src/modules/organizations/organizations.service.ts`](../apps/api/src/modules/organizations/organizations.service.ts) | Registro de mutações críticas na tabela `audit_logs`. |

---

## 2. Controle de Progresso — ETAPA 1 (Fundação e Infraestrutura)

Progresso atual: **5/10 fases concluídas (Fase 05 pronta para auditoria)**.

- [x] **Fase 01 — Planejamento técnico e especificação** (Concluída e Homologada)
- [x] **Fase 02 — Configuração do ambiente e infraestrutura** (Concluída e Homologada)
- [x] **Fase 03 — Monorepo e estrutura do projeto** (Concluída e Homologada)
- [x] **Fase 04 — Backend central NestJS** (Concluída e Homologada)
- [x] **Fase 05 — Banco de dados e modelo multi-tenant** (Concluída - Pronta para Auditoria)
- [ ] **Fase 06 — Autenticação e segurança** (Cadastro, Login, JWT Access/Refresh tokens com rotação)
- [ ] **Fase 07 — Organizações, usuários e permissões** (Membros, convites, papéis e RBAC)
- [ ] **Fase 08 — Frontend e dashboard principal** (Next.js, Tailwind, navegação e layouts)
- [ ] **Fase 09 — Administração e monitoramento** (Painel de superadmin e NOC operacional)
- [ ] **Fase 10 — Integração, testes e auditoria final** (Testes ponta a ponta, homologação e aceite da Etapa 1)

---

## 3. Regras de Execução e Governança

1. **Uma fase por vez**: Nenhuma linha de código de fases subsequentes pode ser escrita sem aprovação formal da anterior.
2. **Sem dados ou botões fictícios**: Todo componente ou tela entregue deve estar conectado a fluxos e endpoints reais.
3. **Imutabilidade de módulos aprovados**: Não refatorar ou reescrever módulos já homologados sem solicitação explícita.
4. **Isolamento de Domínios**: A inteligência de mercado (ASO) e o motor publicitário (Ad Network) operam como serviços desacoplados para garantir resiliência e escalabilidade.
