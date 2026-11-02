# Mobile Growth Platform (MGP) — Monorepo

[![MGP CI](https://github.com/MarcilioLeiteSilva/mgp-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/MarcilioLeiteSilva/mgp-platform/actions/workflows/ci.yml)
[![Turborepo](https://img.shields.io/badge/monorepo-turborepo-ef4444.svg)](https://turbo.build)
[![pnpm](https://img.shields.io/badge/package__manager-pnpm-f69220.svg)](https://pnpm.io)

Plataforma SaaS unificada de **Inteligência de Mercado Mobile (ASO)**, **Rede de Publicidade (Ad Network / Cross-Promotion)** e **Monetização** para aplicativos Android.

---

## 1. Estrutura do Monorepo

```
mgp-platform/
├── apps/
│   ├── api/            # API REST central (NestJS + TypeScript)
│   ├── ad-server/      # Motor de anúncios de alta performance e baixa latência
│   ├── workers/        # Processamento em segundo plano e filas (BullMQ)
│   ├── web/            # Painel do cliente e desenvolvedor (Next.js)
│   └── admin/          # Backoffice global e NOC da plataforma (Next.js)
├── packages/
│   ├── contracts/      # DTOs, schemas Zod e contratos de API compartilhados
│   ├── database/       # Schema Prisma, migrations e cliente PostgreSQL
│   ├── shared/         # Enums, constantes e utilitários globais
│   └── config/         # Validação de variáveis de ambiente com Zod
├── sdk/
│   ├── android/        # SDK nativo Android (Kotlin)
│   └── flutter/        # Plugin oficial Flutter (Dart)
├── infrastructure/     # Docker Compose local, EasyPanel templates, scripts e .env
├── docs/               # Documentação técnica e arquitetura de todas as fases
└── .github/workflows/  # CI/CD automatizado via GitHub Actions
```

---

## 2. Pré-requisitos

* **Node.js:** Versão 20 LTS ou superior (`node -v`)
* **pnpm:** Versão 10.x (`pnpm -v`)
* **Docker & Docker Compose:** Para execução da infraestrutura local (`docker compose version`)

---

## 3. Inicialização Rápida

### 3.1. Subir serviços de banco de dados e cache (Docker)
```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

### 3.2. Instalar dependências do monorepo
```bash
pnpm install
```

### 3.3. Executar o ambiente de desenvolvimento completo
```bash
pnpm dev
```

---

## 4. Scripts Globais de Automação

| Comando | Descrição |
| :--- | :--- |
| `pnpm build` | Compila todos os pacotes e aplicações via Turborepo com cache. |
| `pnpm dev` | Inicia todas as aplicações em modo de desenvolvimento simultâneo. |
| `pnpm lint` | Executa análise estática de código com ESLint em todo o monorepo. |
| `pnpm typecheck`| Valida tipagem estrita de TypeScript em todos os workspaces. |
| `pnpm format` | Formata automaticamente o código seguindo as regras do Prettier. |
| `pnpm clean` | Remove artefatos de compilação (`dist`, `.next`) e limpa caches. |

---

## 5. Convenções de Git e Branches

* **`main`:** Produção estável homologada.
* **`staging`:** Ambiente de homologação e auditoria contínua.
* **`develop`:** Integração das features em desenvolvimento.
* **Commits:** Padrão Conventional Commits obrigatório (`feat:`, `fix:`, `docs:`, `chore:`).

Para detalhes completos de arquitetura e modelos conceituais, consulte o diretório [`docs/`](./docs/README.md).

