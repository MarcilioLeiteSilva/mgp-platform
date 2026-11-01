# Mobile Growth Platform (MGP) — Especificação Técnica Oficial

Bem-vindo à documentação técnica e arquitetural da **Mobile Growth Platform (MGP)**. Este repositório de documentos é a referência normativa para o desenvolvimento, implantação, segurança e governança de todo o ecossistema MGP.

---

## 1. Estrutura da Documentação (Fase 01 — Fundação Documental)

A documentação da **Fase 01** atende rigorosamente a todos os 10 entregáveis exigidos pela especificação-mestre da plataforma:

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
| **10. Controle de Fases do Projeto** | *Seção 2 deste documento abaixo* | Checklist de evolução das 10 Fases da Etapa 1. |

---

## 2. Controle de Progresso — ETAPA 1 (Fundação e Infraestrutura)

Progresso atual: **1/10 fases concluídas (Fase 01 pronta para auditoria)**.

- [x] **Fase 01 — Planejamento técnico e especificação** (Concluída - Fundação documental)
- [ ] **Fase 02 — Configuração do ambiente e infraestrutura** (EasyPanel, Hostinger VPS, Docker, SSL)
- [ ] **Fase 03 — Monorepo e estrutura do projeto** (GitHub, pnpm workspaces, TypeScript, ESLint, Prettier)
- [ ] **Fase 04 — Backend central NestJS** (Bootstrap da API, Health, Swagger, Exception Filters)
- [ ] **Fase 05 — Banco de dados e modelo multi-tenant** (PostgreSQL, Prisma, Migrations e Tenants)
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

