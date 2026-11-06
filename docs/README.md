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

### 1.6. Fase 06 — Autenticação e Segurança
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Criptografia Segura com Bcrypt** | [`apps/api/src/modules/auth/password.service.ts`](../apps/api/src/modules/auth/password.service.ts) | Hash Bcrypt com custo 12 e compatibilidade estrita com credenciais seeded. |
| **02. Guardião Global JWT com Bypass @Public** | [`apps/api/src/common/guards/jwt-auth.guard.ts`](../apps/api/src/common/guards/jwt-auth.guard.ts) | `JwtAuthGuard` global com suporte ao decorator `@Public()`, checagem de usuário e injeção de payload. |
| **03. DTOs Tipados e Validados com OpenAPI** | [`apps/api/src/modules/auth/dto/`](../apps/api/src/modules/auth/dto/) | `RegisterDto`, `LoginDto`, `RefreshTokenDto` e `AuthResponseDto` com validação de formato e anotações Swagger. |
| **04. Cadastro Transacional Atômico** | [`apps/api/src/modules/auth/auth.service.ts`](../apps/api/src/modules/auth/auth.service.ts) | Transação ACID criando User + Org + Membresia OWNER + Carteira com 3 contas contábeis + Sessão inicial. |
| **05. Login e Emissão de Tokens com Sessões** | [`apps/api/src/modules/auth/auth.service.ts`](../apps/api/src/modules/auth/auth.service.ts) | Autenticação de credenciais, validação de usuário ativo, geração de JWT Access Token (15m) e Refresh Token (7d). |
| **06. Rotação de Refresh Token com Detecção de Roubo** | [`apps/api/src/modules/auth/auth.service.ts`](../apps/api/src/modules/auth/auth.service.ts) | Hash criptográfico SHA-256 do token na tabela `sessions`; invalidação em cadeia de todas as sessões se um token revogado for reutilizado (Theft Detection). |
| **07. Revogação de Sessão (Logout)** | [`apps/api/src/modules/auth/auth.service.ts`](../apps/api/src/modules/auth/auth.service.ts) | Invalidação atômica e irrevogável da sessão ativa. |
| **08. Endpoint /auth/me com Organizações Vinculadas** | [`apps/api/src/modules/auth/auth.controller.ts`](../apps/api/src/modules/auth/auth.controller.ts) | Perfil completo do usuário autenticado e listagem das organizações nas quais possui membresia. |
| **09. Integração com TenantGuard** | [`apps/api/src/common/guards/tenant.guard.ts`](../apps/api/src/common/guards/tenant.guard.ts) | `activeOrgId` propagado do JWT payload com fallback flexível para header `x-organization-id`. |
| **10. Suíte de Testes Unitários de Autenticação** | [`apps/api/src/modules/auth/`](../apps/api/src/modules/auth/) | 51 testes unitários aprovados em 9 suítes completas com 100% de sucesso. |

### 1.7. Fase 07 — Organizações, Usuários e Permissões (RBAC)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Modelo e Migration de Convites** | [`packages/database/prisma/migrations/20261102010000_invitations/`](../packages/database/prisma/migrations/20261102010000_invitations/) | Entidade `OrganizationInvitation` com status (`PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`) e índices otimizados. |
| **02. Gestão Cadastral da Organização** | [`apps/api/src/modules/organizations/organizations.service.ts`](../apps/api/src/modules/organizations/organizations.service.ts) | Atualização de dados cadastrais (`name`, `documentCnpjCpf`, `planTier`) restrita a `OWNER` ou `ADMIN` com auditoria. |
| **03. Definição de Organização Padrão** | [`apps/api/src/modules/organizations/organizations.controller.ts`](../apps/api/src/modules/organizations/organizations.controller.ts) | Endpoint `PATCH /organizations/:id/default` alternando atomicamente a organização preferencial do usuário. |
| **04. Gestão de Membros e Papéis RBAC** | [`apps/api/src/modules/organizations/organizations.service.ts`](../apps/api/src/modules/organizations/organizations.service.ts) | Atualização de papéis com hierarquia, adição de membros e listagem completa de equipe. |
| **05. Salvaguardas Contra Orfandade de Tenant** | [`apps/api/src/modules/organizations/organizations.service.ts`](../apps/api/src/modules/organizations/organizations.service.ts) | Bloqueio rigoroso contra remoção, saída ou rebaixamento do único `OWNER` da organização. |
| **06. Transferência Atômica de Posse** | [`apps/api/src/modules/organizations/organizations.service.ts`](../apps/api/src/modules/organizations/organizations.service.ts) | Endpoint `POST /organizations/:id/transfer-ownership` promovendo novo `OWNER` e rebaixando o anterior a `ADMIN`. |
| **07. Fluxo de Convites com Tokens Criptográficos** | [`apps/api/src/modules/organizations/organizations.service.ts`](../apps/api/src/modules/organizations/organizations.service.ts) | Geração de tokens de 64 caracteres hexadecimais, expiração de 7 dias e cancelamento/revogação. |
| **08. Aceite Público e Associação de Membresia** | [`apps/api/src/modules/organizations/invitations.controller.ts`](../apps/api/src/modules/organizations/invitations.controller.ts) | Endpoints `GET /invitations/:token` (público) e `POST /invitations/:token/accept` associando novos membros via transação. |
| **09. Perfil de Usuário e Alteração de Senha** | [`apps/api/src/modules/users/`](../apps/api/src/modules/users/) | Consulta de perfil com contagem de sessões ativas, atualização cadastral e troca segura de senha com revogação em cadeia. |
| **10. Suíte de Testes Automatizados (72 Testes)** | [`apps/api/src/**/*.spec.ts`](../apps/api/src/) | 10 suítes de testes unitários Jest aprovadas com 100% de sucesso (72 testes passing). |

### 1.8. Fase 08 — Frontend e Dashboard Principal (Next.js, Tailwind, Navegação e Layouts)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Design System e Tailwind CSS** | [`apps/web/tailwind.config.js`](../apps/web/tailwind.config.js) / [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css) | Configuração de Tailwind CSS com paleta corporativa MGP (slate profundo, índigo, esmeralda e âmbar). |
| **02. Cliente de API com Auto-Refresh** | [`apps/web/src/lib/api.ts`](../apps/web/src/lib/api.ts) | Cliente HTTP tipado com injeção automática de `Bearer <token>`, `X-Organization-Id` e renovação via `/auth/refresh`. |
| **03. Contexto de Autenticação (`AuthProvider`)** | [`apps/web/src/lib/auth-context.tsx`](../apps/web/src/lib/auth-context.tsx) | Gerenciamento de sessão, perfil, organizações vinculadas, seleção de tenant ativo e métodos de autenticação. |
| **04. Layout Shell Protetor** | [`apps/web/src/components/layout/dashboard-layout.tsx`](../apps/web/src/components/layout/dashboard-layout.tsx) | Shell com verificação de login, skeletons de carregamento e redirecionamento de usuários desautenticados. |
| **05. Barra Lateral Responsiva (`Sidebar`)** | [`apps/web/src/components/layout/sidebar.tsx`](../apps/web/src/components/layout/sidebar.tsx) | Navegação lateral por rotas (`/dashboard`, `/apps`, `/wallet`, `/organization`, `/settings`), tenant ativo e status da rede. |
| **06. Cabeçalho Executivo (`Header`)** | [`apps/web/src/components/layout/header.tsx`](../apps/web/src/components/layout/header.tsx) | Seletor de Tenant dinâmico (troca instantânea de organização), resumo financeiro da Carteira e menu do usuário. |
| **07. Telas de Login e Cadastro Corporativo** | [`apps/web/src/app/(auth)/`](../apps/web/src/app/(auth)/) | Formulários reais conectados a `POST /auth/login` e `POST /auth/register` com validação e feedback visual. |
| **08. Dashboard Executivo Multicontas** | [`apps/web/src/app/(dashboard)/dashboard/page.tsx`](../apps/web/src/app/(dashboard)/dashboard/page.tsx) | Visão geral conectada aos endpoints reais com os 3 cards do Ledger contábil (Advertiser, Exchange, Publisher). |
| **09. Gestão de Aplicativos Android** | [`apps/web/src/app/(dashboard)/apps/page.tsx`](../apps/web/src/app/(dashboard)/apps/page.tsx) | Listagem real de apps via `GET /apps`, criação via `POST /apps` e cópia segura de chaves SDK. |
| **10. Carteira, Equipe, Perfil e Convites Públicos** | [`apps/web/src/app/(dashboard)/`](../apps/web/src/app/(dashboard)/) / [`apps/web/src/app/invitations/`](../apps/web/src/app/invitations/) | Extrato de livro-razão (`/wallet`), gestão de membros e convites (`/organization`), perfil e senha (`/settings`), e aceite público (`/invitations/[token]`). |

### 1.9. Fase 09 — Administração e Monitoramento (Painel de Superadmin e NOC Operacional)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Guardião e Controle de Acesso Superadmin** | [`apps/api/src/common/guards/superadmin.guard.ts`](../apps/api/src/common/guards/superadmin.guard.ts) | `SuperadminGuard` com bloqueio `403 Forbidden` garantindo acesso estrito ao time operacional MGP. |
| **02. DTOs de Moderação e Auditoria** | [`apps/api/src/modules/admin/dto/`](../apps/api/src/modules/admin/dto/) | DTOs tipados e validados (`UpdateUserStatusDto`, `UpdateOrganizationStatusDto`, `UpdateAppStatusDto`, `AuditLogQueryDto`). |
| **03. Visão Geral Operacional e KPIs (`/admin/overview`)** | [`apps/api/src/modules/admin/admin.service.ts`](../apps/api/src/modules/admin/admin.service.ts) | Consolidação de organizações, usuários, apps, sessões ativas, saldos em custódia e latência de banco. |
| **04. Gestão Global de Organizações e Planos** | [`apps/api/src/modules/admin/admin.controller.ts`](../apps/api/src/modules/admin/admin.controller.ts) | Endpoints de consulta e alteração de planos (`FREE`, `PRO`, `ENTERPRISE`) e verificação cadastral (`isVerified`). |
| **05. Gestão Global de Usuários e Suspensão** | [`apps/api/src/modules/admin/admin.controller.ts`](../apps/api/src/modules/admin/admin.controller.ts) | Listagem e suspensão de contas com revogação imediata em lote de todas as sessões ativas (`sessions`). |
| **06. Moderação de Aplicativos e SDK Keys** | [`apps/api/src/modules/admin/admin.controller.ts`](../apps/api/src/modules/admin/admin.controller.ts) | Inspeção e aprovação/suspensão de apps da rede com registro compulsório em auditoria. |
| **07. Trilha de Auditoria Centralizada (`/admin/audit-logs`)** | [`apps/api/src/modules/admin/admin.controller.ts`](../apps/api/src/modules/admin/admin.controller.ts) | Consulta paginada da tabela `audit_logs` com filtros por entidade, operador e ação. |
| **08. Telemetria de Filas Assíncronas (`/admin/system/queues`)** | [`apps/api/src/modules/admin/admin.controller.ts`](../apps/api/src/modules/admin/admin.controller.ts) | Monitoramento de saúde das 4 filas (`queue-telemetry`, `queue-ledger`, `queue-aso-sync`, `queue-fraud`). |
| **09. Exportador de Métricas Prometheus (`/admin/metrics`)** | [`apps/api/src/modules/admin/admin.service.ts`](../apps/api/src/modules/admin/admin.service.ts) | Formato aberto Prometheus com métricas de uptime, heap, latência DB e totalizadores de rede. |
| **10. Painel Web de Backoffice NOC (`apps/admin`)** | [`apps/admin/`](../apps/admin/) | Aplicação Next.js 14 completa com dark theme NOC, 8 rotas funcionais compiladas e Dockerfile de produção. |

### 1.10. Fase 10 — Integração, Testes e Auditoria Final (Encerramento Oficial da Etapa 1)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Suíte de Testes Ponta a Ponta (E2E)** | [`apps/api/src/test/integration-e2e.spec.ts`](../apps/api/src/test/integration-e2e.spec.ts) | 21 testes cobrindo autenticação, rotação de tokens, multi-tenancy, RBAC, convites e ledger. |
| **02. Teste de Rotação e Anti-Theft de Tokens** | [`apps/api/src/test/integration-e2e.spec.ts`](../apps/api/src/test/integration-e2e.spec.ts) | Validação de invalidação em lote de sessões ao reutilizar tokens revogados (Theft Detection). |
| **03. Teste de Isolamento Zero Data Leakage** | [`apps/api/src/test/integration-e2e.spec.ts`](../apps/api/src/test/integration-e2e.spec.ts) | Bloqueio de queries cruzadas entre tenants com `403 Forbidden` e ocultação de IDs (`404`). |
| **04. Teste de Salvaguarda de Tenant e RBAC** | [`apps/api/src/test/integration-e2e.spec.ts`](../apps/api/src/test/integration-e2e.spec.ts) | Bloqueio de exclusão do único OWNER (`400`) e transferência atômica de posse. |
| **05. Teste do Fluxo de Convites Criptográficos** | [`apps/api/src/test/integration-e2e.spec.ts`](../apps/api/src/test/integration-e2e.spec.ts) | Geração de token 64 chars, visualização pública e aceite atômico vinculando novo membro. |
| **06. Teste de Segregação Contábil da Carteira** | [`apps/api/src/test/integration-e2e.spec.ts`](../apps/api/src/test/integration-e2e.spec.ts) | Validação do provisionamento compulsório das 3 contas contábeis do ledger (`ADVERTISER`, `EXCHANGE`, `PUBLISHER`). |
| **07. Teste de Segurança do Superadmin NOC** | [`apps/api/src/test/integration-e2e.spec.ts`](../apps/api/src/test/integration-e2e.spec.ts) | Bloqueio de usuários comuns (`403`), overview com KPIs e revogação de sessões ao suspender conta. |
| **08. Suíte Completa de Testes Automatizados** | `pnpm --filter @mgp/api test` | 13 test suites e 106 testes Jest unitários e de integração aprovados com 100% de sucesso. |
| **09. Script de Auditoria Automatizada** | [`infrastructure/scripts/audit-etapa1.js`](../infrastructure/scripts/audit-etapa1.js) | Executável com `pnpm audit:etapa1` avaliando 93 verificações em 10 dimensões com score 100%. |
| **10. Relatório Oficial de Auditoria Final** | [`docs/architecture/07-etapa1-final-audit-report.md`](./architecture/07-etapa1-final-audit-report.md) | Parecer técnico formal certificando o encerramento da Etapa 1 e liberação da Etapa 2. |

### 1.11. Fase 11 — Motor de Coleta e Scraping da Google Play (Etapa 2 - ASO)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Arquitetura do Engine de Coleta Play Store** | [`docs/aso/01-play-store-scraper-engine.md`](./aso/01-play-store-scraper-engine.md) | Especificação técnica do motor de scraping, topologia de cache e rate limiting. |
| **02. Tipos e Contratos de Metadados Play Store** | [`apps/api/src/modules/aso/types/google-play.types.ts`](../apps/api/src/modules/aso/types/google-play.types.ts) | Modelos TypeScript para metadados de apps, busca, rankings e categorias. |
| **03. Cache Redis Resiliente e Fallback em Memória** | [`apps/api/src/modules/aso/services/aso-cache.service.ts`](../apps/api/src/modules/aso/services/aso-cache.service.ts) | Serviço de cache com TTLs diferenciados e degradação suave contra falhas de conexão. |
| **04. Controle de Concorrência e Rate Limiting** | [`apps/api/src/modules/aso/services/aso-rate-limiter.service.ts`](../apps/api/src/modules/aso/services/aso-rate-limiter.service.ts) | Semáforo assíncrono com espaçamento de picos e retry exponencial em erros transitórios. |
| **05. Motor de Coleta e Normalização** | [`apps/api/src/modules/aso/services/play-scraper-engine.service.ts`](../apps/api/src/modules/aso/services/play-scraper-engine.service.ts) | Engine com carregamento dinâmico do `google-play-scraper`, normalização e cache. |
| **06. DTOs Tipados e Validados com Swagger** | [`apps/api/src/modules/aso/dto/`](../apps/api/src/modules/aso/dto/) | DTOs de validação com `class-validator`, `class-transformer` e OpenAPI. |
| **07. Controller REST Protegido por JWT** | [`apps/api/src/modules/aso/controllers/play-scraper.controller.ts`](../apps/api/src/modules/aso/controllers/play-scraper.controller.ts) | Endpoints REST `/api/v1/aso/scraper/*` protegidos por `JwtAuthGuard`. |
| **08. Módulo NestJS Registrado** | [`apps/api/src/modules/aso/aso.module.ts`](../apps/api/src/modules/aso/aso.module.ts) | Registro central e injeção do `AsoModule` no `AppModule`. |
| **09. Suíte de Testes Automatizados Jest** | `apps/api/src/modules/aso/**/*.spec.ts` | 4 suítes com 100% de cobertura nos serviços e controller do motor de scraping. |

### 1.12. Fase 12 — Modelagem de Dados ASO no Prisma (Etapa 2 - ASO)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Especificação da Modelagem de Dados ASO** | [`docs/database/02-aso-data-model.md`](./database/02-aso-data-model.md) | Diagrama ERD Mermaid, atributos e documentação detalhada dos modelos. |
| **02. Schema do Prisma com 5 Modelos ASO** | [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma) | Modelos `AsoApp`, `AsoKeyword`, `AsoAppKeyword`, `AsoKeywordRankingHistory` e `AsoAuditScore`. |
| **03. Migration SQL Versionada** | [`packages/database/prisma/migrations/20261105000000_aso_engine/`](../packages/database/prisma/migrations/20261105000000_aso_engine/) | DDL relacional com constraints de unicidade, índices e foreign keys. |
| **04. Contratos e DTOs Tipados** | [`packages/contracts/src/aso.contracts.ts`](../packages/contracts/src/aso.contracts.ts) | Tipos e interfaces TypeScript padronizados para todo o monorepo. |
| **05. Suíte de Testes de Banco e Modelos** | [`apps/api/src/modules/aso/aso-database.spec.ts`](../apps/api/src/modules/aso/aso-database.spec.ts) | Testes unitários de persistência e integridade referencial com PrismaService. |
| **06. Seed de Dados Demonstrativos** | [`packages/database/prisma/seed.ts`](../packages/database/prisma/seed.ts) | Provisionamento de app demonstrativo com keywords, posições e auditoria. |

### 1.13. Fase 13 — Backend Central ASO (Etapa 2 - ASO)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Arquitetura do Backend ASO** | [`docs/aso/02-aso-backend-services.md`](./aso/02-aso-backend-services.md) | Especificação técnica de serviços, algoritmos heurísticos e rotas REST. |
| **02. Serviço de Aplicativos Monitorados** | [`apps/api/src/modules/aso/services/aso-apps.service.ts`](../apps/api/src/modules/aso/services/aso-apps.service.ts) | Gestão de catálogo, concorrentes, sync de metadados e auditoria inicial. |
| **03. Serviço de Palavras-Chave e Rankings** | [`apps/api/src/modules/aso/services/aso-keywords.service.ts`](../apps/api/src/modules/aso/services/aso-keywords.service.ts) | Rastreamento orgânico, detecção de posições e séries temporais. |
| **04. Serviço de Auditoria Heurística** | [`apps/api/src/modules/aso/services/aso-audit.service.ts`](../apps/api/src/modules/aso/services/aso-audit.service.ts) | Algoritmo determinístico de pontuações (0-100) e recomendações acionáveis. |
| **05. Controller REST Multi-Tenant** | [`apps/api/src/modules/aso/controllers/aso.controller.ts`](../apps/api/src/modules/aso/controllers/aso.controller.ts) | Endpoints `/api/v1/aso/*` protegidos por `JwtAuthGuard` e `TenantGuard`. |
| **06. DTOs Tipados e Validados** | [`apps/api/src/modules/aso/dto/`](../apps/api/src/modules/aso/dto/) | DTOs para monitoramento de apps, keywords, filtros e histórico. |
| **07. Suítes de Testes Automatizados Jest** | `apps/api/src/modules/aso/**/*.spec.ts` | 4 suítes cobrindo apps, keywords, auditoria e controller (22 suítes no total). |

### 1.14. Fase 14 — Workers de Coleta e Sincronização Assíncrona (Etapa 2 - ASO)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Arquitetura de Workers & Filas** | [`docs/aso/03-aso-workers-and-queues.md`](./aso/03-aso-workers-and-queues.md) | Especificação técnica da fila BullMQ `queue-aso-sync`, pacing e crons. |
| **02. Processador BullMQ ASO** | [`apps/workers/src/processors/aso-sync.processor.ts`](../apps/workers/src/processors/aso-sync.processor.ts) | Consumidor desacoplado com roteamento modular por tipo de job. |
| **03. Handlers de Sincronização e Posições** | [`apps/workers/src/handlers/`](../apps/workers/src/handlers/) | Handlers modulares com pacing dinâmico contra rate limiting e bloqueios IP. |
| **04. Agendador Cron Determinístico** | [`apps/workers/src/scheduler/aso-cron.scheduler.ts`](../apps/workers/src/scheduler/aso-cron.scheduler.ts) | Cron diário (03:00 UTC) para rankings e semanal (04:00 UTC domingos) para metadados. |
| **05. Produtor BullMQ na API** | [`apps/api/src/modules/aso/services/aso-queue.service.ts`](../apps/api/src/modules/aso/services/aso-queue.service.ts) | Enfileiramento seguro com fallback resiliente e endpoints de telemetria. |
| **06. Dockerfile Multi-Stage de Produção** | [`infrastructure/docker/Dockerfile.workers`](../infrastructure/docker/Dockerfile.workers) | Container alpine otimizado para execução contínua de workers. |
| **07. Suíte de Testes Automatizados** | `apps/workers/src/**/*.spec.ts` | 4 suítes Jest cobrindo processador, scheduler e serviços auxiliares (15 testes passing). |

### 1.15. Fase 15 — Interface Visual do ASO Studio (Etapa 2 - ASO)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Especificação do Frontend ASO Studio** | [`docs/aso/04-aso-studio-frontend.md`](./aso/04-aso-studio-frontend.md) | Guia de componentes, arquitetura de páginas e visualizações de dados. |
| **02. Hub Principal do ASO Studio** | [`apps/web/src/app/(dashboard)/aso/page.tsx`](../apps/web/src/app/(dashboard)/aso/page.tsx) | KPIs agregados, abas Meus Apps / Concorrentes e Play Store Explorer. |
| **03. Painel de Detalhe e Diagnóstico** | [`apps/web/src/app/(dashboard)/aso/[id]/page.tsx`](../apps/web/src/app/(dashboard)/aso/[id]/page.tsx) | Hero com dados da loja, tabela de keywords com badges e histórico. |
| **04. Gauge Circular de Score ASO** | [`apps/web/src/components/aso/audit-gauge.tsx`](../apps/web/src/components/aso/audit-gauge.tsx) | Indicador visual em SVG circular com código de cores semafórico. |
| **05. Gráfico de Série Temporal de Rankings** | [`apps/web/src/components/aso/ranking-chart.tsx`](../apps/web/src/components/aso/ranking-chart.tsx) | Gráfico SVG interativo com eixo Y invertido (topo = posição #1). |
| **06. Modais Reais de Inclusão** | [`apps/web/src/components/aso/add-app-modal.tsx`](../apps/web/src/components/aso/add-app-modal.tsx) | Modais funcionais para cadastrar novos apps e adicionar termos de busca. |
| **07. Telemetria de Workers na UI** | [`apps/web/src/components/aso/queue-status-badge.tsx`](../apps/web/src/components/aso/queue-status-badge.tsx) | Badge em tempo real exibindo status da fila assíncrona BullMQ. |

### 1.16. Fase 16 — Integração, Testes E2E e Homologação da Etapa 2
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Suíte de Testes Ponta a Ponta (E2E)** | [`apps/api/src/test/aso-e2e.spec.ts`](../apps/api/src/test/aso-e2e.spec.ts) | 15 testes integrados validando Scraper, Prisma, Multi-Tenant, Workers e Frontend. |
| **02. Script de Auditoria Automatizada** | [`infrastructure/scripts/audit-etapa2.js`](../infrastructure/scripts/audit-etapa2.js) | Executável com `pnpm audit:etapa2` avaliando 52 verificações com Score 100%. |
| **03. Relatório Oficial de Certificação** | [`docs/aso/05-etapa2-audit-and-certification.md`](./aso/05-etapa2-audit-and-certification.md) | Parecer técnico formal certificando o encerramento da Etapa 2 e liberação da Etapa 3. |

### 1.17. Fase 17 — Arquitetura do SDK Android e Especificação de Telemetria (Etapa 3 - SDK & Ad Network)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Arquitetura do SDK Android** | [`docs/sdk/01-sdk-architecture.md`](./sdk/01-sdk-architecture.md) | Especificação técnica do SDK Kotlin (minSDK 24, targetSDK 34), ciclo de vida e concorrência. |
| **02. Protocolo de Telemetria e Antifraude** | [`docs/sdk/02-telemetry-specification.md`](./sdk/02-telemetry-specification.md) | Taxonomia de eventos, payloads JSON, assinatura HMAC-SHA256, deduplicação de Nonce e buffer local. |
| **03. Contratos de Telemetria no Monorepo** | [`packages/contracts/src/telemetry.contracts.ts`](../packages/contracts/src/telemetry.contracts.ts) | Schemas Zod e tipos TypeScript ponta a ponta integrados a `@mgp/contracts`. |
| **04. Estrutura Base do SDK Kotlin** | [`sdk/android/`](../sdk/android/) | Configuração Gradle multi-módulo, AndroidManifest com permissões estritas e ProGuard consumer rules. |
| **05. Modelos Centrais e Inspetor de Integridade** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/) | Classes `MGP`, `MgpConfig`, `MgpLifecycleTracker`, `TelemetryManager` e `DeviceIntegrity`. |
| **06. Suítes de Testes Automatizados** | [`apps/api/src/test/telemetry-contracts.spec.ts`](../apps/api/src/test/telemetry-contracts.spec.ts) | Validação completa de contratos Zod, tipos de eventos e envelopes de telemetria (8 testes passing). |

### 1.18. Fase 18 — Implementação do SDK Android (Core, Device Fingerprint, Heartbeat) (Etapa 3 - SDK & Ad Network)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Extrator de Hardware, App e Rede** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/core/DeviceContextExtractor.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/core/DeviceContextExtractor.kt) | Extração ética de contexto, Google Play Advertising ID e suporte a Limit Ad Tracking. |
| **02. Buffer Local Persistente SQLite** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/storage/TelemetryDatabaseHelper.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/storage/TelemetryDatabaseHelper.kt) | Persistência offline embarcada, rotação circular (máx. 1.000 eventos) e recuperação FIFO. |
| **03. Transmissor HTTP Nativo Resiliente** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/network/TelemetryHttpClient.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/network/TelemetryHttpClient.kt) | Cliente HttpURLConnection com serialização JSON manual sem dependências externas. |
| **04. Worker em Segundo Plano WorkManager** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/worker/TelemetrySyncWorker.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/worker/TelemetrySyncWorker.kt) | Sincronização em background com restrição de rede ativa e backoff exponencial. |
| **05. Gerenciador Central de Telemetria** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/TelemetryManager.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/telemetry/TelemetryManager.kt) | Assinatura HMAC-SHA256, geração de Nonce, enfileiramento duplo e controle de flush. |
| **06. Ponto de Entrada MGP e Heartbeat** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/MGP.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/MGP.kt) | Métodos públicos MGP.initialize, trackEvent, flush, getSessionId e getPendingTelemetryCount. |
| **07. Guia Oficial de Integração do SDK** | [`docs/sdk/03-sdk-implementation-guide.md`](./sdk/03-sdk-implementation-guide.md) | Manual passo a passo para publishers com Gradle, Application, ProGuard e Data Safety. |

### 1.19. Fase 19 — Engine de Eventos, Atribuição e Antifraude no Backend (Etapa 3 - SDK & Ad Network)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Modelagem Relacional de Telemetria** | [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma) | Tabelas `telemetry_sessions` e `telemetry_events` com particionamento multi-tenant e índices. |
| **02. Migration Versionada de Telemetria** | [`packages/database/prisma/migrations/20261106000000_telemetry_engine/`](../packages/database/prisma/migrations/20261106000000_telemetry_engine/) | DDL SQL gerado para PostgreSQL com relacionamentos com `App` e `Organization`. |
| **03. Serviço de Antifraude e Criptografia** | [`apps/api/src/modules/telemetry/services/telemetry-antifraud.service.ts`](../apps/api/src/modules/telemetry/services/telemetry-antifraud.service.ts) | HMAC-SHA256 (`timingSafeEqual`), anti-replay com Redis (TTL 600s), detecção de emulador e root. |
| **04. Ingestão e Produtor BullMQ** | [`apps/api/src/modules/telemetry/services/telemetry-ingestion.service.ts`](../apps/api/src/modules/telemetry/services/telemetry-ingestion.service.ts) | Validação em pipeline de alta performance desacoplada via fila `queue-telemetry`. |
| **05. Controller REST de Telemetria** | [`apps/api/src/modules/telemetry/controllers/telemetry.controller.ts`](../apps/api/src/modules/telemetry/controllers/telemetry.controller.ts) | Endpoint público `POST /api/v1/telemetry/batch` e endpoint NOC `GET /api/v1/telemetry/metrics`. |
| **06. Worker Consumer BullMQ** | [`apps/workers/src/processors/telemetry.processor.ts`](../apps/workers/src/processors/telemetry.processor.ts) | Processamento assíncrono, cálculo de duração de sessões e inserção em lote (`createMany`). |
| **07. Especificação Técnica e de Antifraude** | [`docs/sdk/04-telemetry-engine-and-antifraud.md`](./sdk/04-telemetry-engine-and-antifraud.md) | Documentação normativa do motor de eventos, pipeline assíncrono e conformidade LGPD. |

### 1.20. Fase 20 — Ad Server de Ultra-Baixa Latência (Fastify / High Performance) (Etapa 3 - SDK & Ad Network)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Engine Fastify de Alta Performance** | [`apps/ad-server/src/app.ts`](../apps/ad-server/src/app.ts) | Servidor nativo Fastify com rate limiting, CORS e Pino structured logging. |
| **02. Serviço Criptográfico de Tokens** | [`apps/ad-server/src/services/token.service.ts`](../apps/ad-server/src/services/token.service.ts) | Assinatura e verificação de impression e click tokens via HMAC-SHA256 (`timingSafeEqual`). |
| **03. Cache e Anti-Replay com Redis** | [`apps/ad-server/src/services/cache.service.ts`](../apps/ad-server/src/services/cache.service.ts) | Deduplicação atômica de nonces (`SET NX EX 600`), cache de inventário e fallback em memória. |
| **04. Motor de Decisão e Leilão de Anúncios** | [`apps/ad-server/src/services/ad-decision.service.ts`](../apps/ad-server/src/services/ad-decision.service.ts) | Resolução de inventário, priorização de campanhas (PAID > EXCHANGE > HOUSE_AD) e floor eCPM. |
| **05. Despacho Assíncrono de Eventos** | [`apps/ad-server/src/services/event-queue.service.ts`](../apps/ad-server/src/services/event-queue.service.ts) | Produtor BullMQ para `queue-ad-impressions` e `queue-ad-clicks` com métricas operacionais. |
| **06. Endpoints REST de Anúncios e Telemetria** | [`apps/ad-server/src/routes/`](../apps/ad-server/src/routes/) | `/health`, `/ads/request`, `/events/impression`, `/events/click`, `/click/track` e `/metrics`. |
| **07. Dockerfile Multi-Stage Otimizado** | [`infrastructure/docker/Dockerfile.adserver`](../infrastructure/docker/Dockerfile.adserver) | Imagem Alpine leve e segura com suporte a Prisma e execução como usuário `adserver`. |
| **08. Suíte de Testes Automatizados** | [`apps/ad-server/src/**/*.spec.ts`](../apps/ad-server/src/) | 25 testes unitários e de integração Fastify aprovados (100% green). |
| **09. Especificação Técnica e Arquitetural** | [`docs/adserver/01-adserver-architecture-and-specs.md`](./adserver/01-adserver-architecture-and-specs.md) | Documento normativo oficial do motor de ultra-baixa latência e leilão. |

### 1.21. Fase 21 — Motor de Decisão, Leilão RTB e Entrega de Formatos (Banners, Interstitials, Rewarded) (Etapa 3 - SDK & Ad Network)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Contratos de Formatos e Leilão** | [`packages/contracts/src/ad-server.contracts.ts`](../packages/contracts/src/ad-server.contracts.ts) | Schemas Zod para Banner, Native, Interstitial, Rewarded e RewardEventSchema. |
| **02. Modelagem Relacional e Migrations** | [`packages/database/prisma/schema.prisma`](../packages/database/prisma/schema.prisma) | Campos de targeting, frequency capping e metadados de criativos dos 4 formatos. |
| **03. Migration SQL Versionada** | [`packages/database/prisma/migrations/20261106010000_rtb_formats/`](../packages/database/prisma/migrations/20261106010000_rtb_formats/) | Migration DDL adicionando colunas de formato e capping em `creatives` e `campaigns`. |
| **04. Motor RTB e Normalização de eCPM** | [`apps/ad-server/src/services/ad-decision.service.ts`](../apps/ad-server/src/services/ad-decision.service.ts) | Normalização de eCPM (CPM, CPC, CPI) e leilão de segundo preço (Vickrey Auction). |
| **05. Frequency Capping em Redis** | [`apps/ad-server/src/services/cache.service.ts`](../apps/ad-server/src/services/cache.service.ts) | Controle de saturação por usuário/hora (`INCR freq:{campaignId}:{advertisingId}`). |
| **06. Rota e Validador de Recompensas** | [`apps/ad-server/src/routes/events.route.ts`](../apps/ad-server/src/routes/events.route.ts) | Endpoint `POST /events/reward` com checagem de tempo assistido e anti-replay. |
| **07. Fila Assíncrona de Recompensas** | [`apps/ad-server/src/services/event-queue.service.ts`](../apps/ad-server/src/services/event-queue.service.ts) | Produtor BullMQ para `queue-ad-rewards` integrado ao pipeline de eventos. |
| **08. Suíte de Testes RTB e Formatos** | [`apps/ad-server/src/**/*.spec.ts`](../apps/ad-server/src/) | 29 testes cobrindo os 4 formatos, cálculo de eCPM, Second-Price e resgate de recompensa. |
| **09. Especificação Normativa de RTB e Formatos** | [`docs/adserver/02-rtb-auction-and-formats.md`](./adserver/02-rtb-auction-and-formats.md) | Documento normativo oficial do motor de leilão competitivo e formatos. |

### 1.22. Fase 22 — Integração do SDK com o Ad Server e Homologação da Etapa 3 (Etapa 3 - SDK & Ad Network)
| Entregável | Arquivo de Referência | Descrição |
| :--- | :--- | :--- |
| **01. Modelos de Dados de Anúncios no SDK** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/model/AdModels.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/model/AdModels.kt) | Modelos `AdRequest`, `AdResponse`, `CreativeData`, `VisibilityMetrics` e listeners de ciclo de vida. |
| **02. Cliente HTTP de Anúncios do SDK** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/network/AdHttpClient.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/network/AdHttpClient.kt) | Cliente `HttpURLConnection` nativo de ultra-baixa latência conectando aos endpoints do Ad Server. |
| **03. Componente Banner com Viewability MRC** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/banner/MgpBannerView.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/banner/MgpBannerView.kt) | Custom FrameLayout com aferição contínua de 50% de pixels visíveis por 1s contínuo (padrão IAB/MRC). |
| **04. Interstitial com Skip Countdown** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/interstitial/MgpInterstitialAd.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/interstitial/MgpInterstitialAd.kt) | Fullscreen manager com contagem regressiva de skip offset (padrão 5s) e tracking de impressão/clique. |
| **05. Rewarded Ad com Verificação Criptográfica**| [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/rewarded/MgpRewardedAd.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/rewarded/MgpRewardedAd.kt) | Trava obrigatória de tempo assistido, envio de `rewardToken` e callback seguro `OnUserEarnedRewardListener`. |
| **06. Anúncios Nativos Desacoplados** | [`sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/nativead/MgpNativeAd.kt`](../sdk/android/mgp-sdk/src/main/kotlin/com/mgp/sdk/ads/nativead/MgpNativeAd.kt) | Binding livre de headline, body, icon, media, star rating e sponsor text na interface do app. |
| **07. Processador de Eventos Publicitários** | [`apps/workers/src/processors/ad-events.processor.ts`](../apps/workers/src/processors/ad-events.processor.ts) | Consumer BullMQ para impressões, cliques e recompensas com liquidação contábil e auditoria. |
| **08. Suíte de Testes Ponta a Ponta da Etapa 3** | [`apps/ad-server/src/test/etapa3-e2e.spec.ts`](../apps/ad-server/src/test/etapa3-e2e.spec.ts) | Teste integrado cobrindo os 4 formatos, leilão RTB, nonces, anti-replay e pipeline de workers. |
| **09. Script de Auditoria Automatizada da Etapa 3** | [`infrastructure/scripts/audit-etapa3.js`](../infrastructure/scripts/audit-etapa3.js) | Executável com `pnpm audit:etapa3` avaliando 74 verificações rigorosas com Score 100%. |
| **10. Relatório Oficial de Certificação da Etapa 3**| [`docs/sdk/05-etapa3-audit-and-certification.md`](./sdk/05-etapa3-audit-and-certification.md) | Parecer técnico formal certificando o encerramento da Etapa 3 e liberação da Etapa 4. |

---

## 2. Controle de Progresso — ETAPA 1 (Fundação e Infraestrutura)

Progresso atual: **10/10 fases concluídas (Etapa 1 — 100% Concluída e Homologada)**.

- [x] **Fase 01 — Planejamento técnico e especificação** (Concluída e Homologada)
- [x] **Fase 02 — Configuração do ambiente e infraestrutura** (Concluída e Homologada)
- [x] **Fase 03 — Monorepo e estrutura do projeto** (Concluída e Homologada)
- [x] **Fase 04 — Backend central NestJS** (Concluída e Homologada)
- [x] **Fase 05 — Banco de dados e modelo multi-tenant** (Concluída e Homologada)
- [x] **Fase 06 — Autenticação e segurança** (Concluída e Homologada)
- [x] **Fase 07 — Organizações, usuários e permissões** (Concluída e Homologada)
- [x] **Fase 08 — Frontend e dashboard principal** (Concluída e Homologada)
- [x] **Fase 09 — Administração e monitoramento** (Concluída e Homologada)
- [x] **Fase 10 — Integração, testes e auditoria final** (Concluída e Homologada — Score 100%)

---

## 3. Controle de Progresso — ETAPA 2 (Motor de Inteligência & ASO)

Progresso atual: **6/6 fases concluídas (Etapa 2 — 100% Concluída e Homologada)**.

- [x] **Fase 11 — Motor de Coleta e Scraping da Google Play (Play Scraper Engine, Cache Redis e Rate Limiter)** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 12 — Modelagem de Dados ASO no Prisma (Catálogo, Palavras-chave e Histórico)** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 13 — Backend Central ASO (AsoModule no NestJS)** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 14 — Workers de Coleta e Sincronização Assíncrona (`apps/workers` - `queue-aso-sync`)** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 15 — Interface Visual do ASO Studio (`apps/web`)** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 16 — Integração, Testes e Homologação da Etapa 2** ✅ [CONCLUÍDA E HOMOLOGADA — SCORE 100%]

---

## 4. Controle de Progresso — ETAPA 3 (SDK Android, Ad Server & Motor Publicitário)

Progresso atual: **6/6 fases concluídas (Etapa 3 — 100% Concluída e Homologada)**.

- [x] **Fase 17 — Arquitetura do SDK Android e Especificação de Telemetria** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 18 — Implementação do SDK Android (Core, Device Fingerprint, Heartbeat)** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 19 — Engine de Eventos, Atribuição e Antifraude no Backend** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 20 — Ad Server de Ultra-Baixa Latência (Fastify / High Performance)** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 21 — Motor de Decisão, Leilão RTB e Entrega de Formatos (Banners, Interstitials, Rewarded)** ✅ [CONCLUÍDA E HOMOLOGADA]
- [x] **Fase 22 — Integração do SDK com o Ad Server e Homologação da Etapa 3** ✅ [CONCLUÍDA E HOMOLOGADA — SCORE 100%]

---

## 5. Planejamento — ETAPA 4 (Motor de Campanhas, Gestão Financeira & Marketplace)

Progresso atual: **0/6 fases concluídas (Etapa 4)**.

- [ ] **Fase 23 — Gestão de Campanhas, Criativos e Segmentação de Público** ◀ **[PRÓXIMA FASE A EXECUTAR]**
- [ ] **Fase 24 — Painel de Publishers, Configuração de Ad Units e Relatórios de Monetização**
- [ ] **Fase 25 — Motor de Payouts, Faturamento e Integração com Gateways de Pagamento**
- [ ] **Fase 26 — Motor de Recomendações e Otimização Automática de Lances**
- [ ] **Fase 27 — Painel de Controle de Fraudes e Detecção de Tráfego Inválido (IVT)**
- [ ] **Fase 28 — Integração, Testes E2E e Homologação Final da Etapa 4**

---

## 6. Ponto de Retomada dos Trabalhos (Checklist para o Próximo Turno)

1. **Estado do Repositório:**
   * Branches `main` e `develop` sincronizadas com `origin` (https://github.com/MarcilioLeiteSilva/mgp-platform).
   * Working tree 100% limpa, sem pendências ou arquivos órfãos.
2. **Saúde da Plataforma:**
   * Auditoria geral Etapa 1: `node infrastructure/scripts/audit-etapa1.js` (**Score: 100% — 93/93 checks**).
   * Auditoria geral Etapa 2: `node infrastructure/scripts/audit-etapa2.js` (**Score: 100% — 82/82 checks**).
   * Auditoria geral Etapa 3: `node infrastructure/scripts/audit-etapa3.js` (**Score: 100% — 74/74 checks**).
   * Total de verificações auditadas no monorepo: **249/249 checks aprovados (Score 100% global)**.
   * Suíte completa de testes Jest da API: `npm test --prefix apps/api` (**239 testes passing em 28 suítes, 0 falhas**).
   * Suíte completa de testes Jest dos Workers: `npm test --prefix apps/workers` (**25 testes passing em 6 suítes, 0 falhas**).
   * Suíte completa de testes Jest do Ad Server: `npm test --prefix apps/ad-server` (**37 testes passing em 5 suítes, 0 falhas**).
   * Total de testes automatizados da plataforma: **301 testes aprovados (100% green)**.
   * Compilação dos contratos compartilhados: `pnpm --filter @mgp/contracts build` (**100% verde**).
   * Compilação do banco de dados & Prisma: `pnpm --filter @mgp/database build` (**100% verde**).
   * Compilação dos workers assíncronos: `npm run build --prefix apps/workers` (**100% verde**).
   * Compilação da API central NestJS: `npm run build --prefix apps/api` (**100% verde**).
   * Compilação do Ad Server Fastify: `npm run build --prefix apps/ad-server` (**100% verde**).
3. **Ponto de Partida Imediato:**
   * Iniciar diretamente a **ETAPA 4 — Fase 23: Gestão de Campanhas, Criativos e Segmentação de Público**.

---

## 7. Regras de Execução e Governança

1. **Uma fase por vez**: Nenhuma linha de código de fases subsequentes pode ser escrita sem aprovação formal da anterior.
2. **Sem dados ou botões fictícios**: Todo componente ou tela entregue deve estar conectado a fluxos e endpoints reais.
3. **Imutabilidade de módulos aprovados**: Não refatorar ou reescrever módulos já homologados sem solicitação explícita.
4. **Isolamento de Domínios**: A inteligência de mercado (ASO) e o motor publicitário (Ad Network) operam como serviços desacoplados para garantir resiliência e escalabilidade.
