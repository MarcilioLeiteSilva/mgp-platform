# 02. Backend Central ASO — Gestão, Rastreamento e Auditoria Heurística (`AsoModule`)

## 1. Visão Geral da Arquitetura

A **Fase 13** da **Mobile Growth Platform (MGP)** estabelece o backend central de inteligência para o ecossistema de **App Store Optimization (ASO)**, implementado no módulo NestJS [`apps/api/src/modules/aso/aso.module.ts`](file:///f:/mobile_growth/apps/api/src/modules/aso/aso.module.ts).

O módulo conecta os dados relacionais do PostgreSQL 16 (modelados na Fase 12) ao motor de coleta e scraping em tempo real da Google Play Store (desenvolvido na Fase 11), sob estrito isolamento lógico multi-tenant (`TenantGuard`).

```
                    +-------------------------------------------------------+
                    |                      AsoController                    |
                    |          (Rotas REST /api/v1/aso - TenantGuard)       |
                    +---------+-----------------+-----------------+---------+
                              |                 |                 |
                              v                 v                 v
                    +------------------+ +--------------+ +-----------------+
                    |  AsoAppsService  | | AsoKeywords  | | AsoAuditService |
                    |  - Gestão Apps   | |   Service    | | - Algoritmo     |
                    |  - Concorrentes  | | - Rastreamento| |   Heurístico    |
                    |  - Sync Metadados| | - Histórico  | | - Recomendações |
                    +---------+--------+ +------+-------+ +--------+--------+
                              |                 |                  |
                              +--------+--------+------------------+
                                       |
                     +-----------------+-----------------+
                     |                                   |
                     v                                   v
        +-------------------------+         +-------------------------+
        | PlayScraperEngineService|         |      PrismaService      |
        |  (Google Play Scraper)  |         | (PostgreSQL 16 Multi-T) |
        +-------------------------+         +-------------------------+
```

---

## 2. Serviços Especializados e Regras de Negócio

### 2.1. `AsoAppsService` (Catálogo e Monitoramento de Aplicativos)
Gerencia o portfólio de aplicativos monitorados pela organização:
- **Cadastro com Coleta em Tempo Real:** Ao adicionar um `appId` (ex: `com.whatsapp`), consulta a Google Play Store através do `PlayScraperEngineService` e popula automaticamente título, desenvolvedor, ícone, categoria, nota, reviews, volume estimado de downloads e capturas de tela.
- **Auditoria Automática Inicial:** Imediatamente após cadastrar o aplicativo, dispara a primeira auditoria ASO heurística para gerar um diagnóstico base.
- **Suporte a Concorrentes:** Permite cadastrar aplicativos com `isCompetitor = true` vinculados a um `targetAppId` principal para inteligência competitiva e benchmarks.
- **Sincronização Sob Demanda (`syncApp`):** Revalida os metadados diretamente na loja e recalcula o score de auditoria.
- **Isolamento Multi-Tenant:** Todas as operações filtram estritamente por `organizationId`, bloqueando acessos não autorizados com `404 Not Found`.

### 2.2. `AsoKeywordsService` (Rastreamento de Palavras-Chave e Séries Temporais)
Mapeia a indexação orgânica e o posicionamento do aplicativo na busca:
- **Dicionário Global e Associação $N:M$:** Normaliza termos de pesquisa em `aso_keywords` e vincula ao app via `aso_app_keywords`.
- **Identificação Imediata de Rank:** Ao cadastrar uma palavra-chave, pesquisa na Google Play Store (top 100 resultados) e detecta a posição exata ocupada pelo app.
- **Série Temporal de Rankings:** Cada verificação com sucesso grava um snapshot imutável em `aso_keyword_ranking_history`, viabilizando gráficos de evolução histórica.
- **Rechecagem Pontual (`checkRank`):** Permite rechecar a posição a qualquer momento, atualizando `currentRank`, `previousRank` e `bestRank`.

### 2.3. `AsoAuditService` (Algoritmo Heurístico de Auditoria ASO)
Executa análise multifatorial da página do aplicativo na Google Play Store, gerando scores setoriais (0 a 100) e recomendações acionáveis:

| Critério | Peso | Regras e Limites da Google Play Store |
| :--- | :---: | :--- |
| **Título (`titleScore`)** | **25%** | Limite máximo: 30 caracteres. Ideal: 20 a 30 caracteres com palavra-chave principal. Penaliza títulos curtos (< 15 chars) ou superiores a 30. |
| **Descrição Curta (`shortDescriptionScore`)** | **15%** | Limite: 80 caracteres. Ideal: 60 a 80 caracteres com gancho de conversão e proposta de valor clara. |
| **Descrição Completa (`longDescriptionScore`)** | **20%** | Limite: 4.000 caracteres. Ideal: 2.000 a 3.500 caracteres, presença de tópicos, quebras de linha e densidade semântica. |
| **Ícone (`iconScore`)** | **10%** | Presença de ícone de alta resolução com contraste e visibilidade na grade da loja. |
| **Screenshots (`screenshotsScore`)** | **15%** | Mínimo de 4 capturas exigido para ranqueamento; ideal de 6 a 8 prints verticais/horizontais demonstrando recursos centrais. |
| **Notas & Avaliações (`ratingsScore`)** | **15%** | Média ponderada da nota ($\ge 4.5 \rightarrow 100$; $\ge 4.0 \rightarrow 80$; $< 3.5 \rightarrow 40$) combinada com volume de avaliações. |

- **Fórmula do Overall Score:**
  $$\text{OverallScore} = \text{round}(0.25 \times \text{Title} + 0.15 \times \text{ShortDesc} + 0.20 \times \text{LongDesc} + 0.10 \times \text{Icon} + 0.15 \times \text{Screenshots} + 0.15 \times \text{Ratings})$$
- **Recomendações Estruturadas:** Array de objetos contendo `id`, `category`, `severity` (`HIGH`, `MEDIUM`, `LOW`, `INFO`), `message` explicativa e `suggestedAction` prática.

---

## 3. Endpoints REST da API (`/api/v1/aso/*`)

Todas as rotas exigem autenticação via Bearer JWT (`JwtAuthGuard`) e contexto de organização via header `x-organization-id` (`TenantGuard`):

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/v1/aso/apps` | Cadastra e inicia monitoramento de um app (coleta Play Store + auditoria) |
| `GET` | `/api/v1/aso/apps` | Lista aplicativos monitorados da organização (`?isCompetitor=&page=&limit=`) |
| `GET` | `/api/v1/aso/apps/:id` | Obtém detalhes completos e diagnósticos recentes de um app |
| `POST` | `/api/v1/aso/apps/:id/sync` | Sincroniza metadados frescos diretamente da loja sob demanda |
| `DELETE` | `/api/v1/aso/apps/:id` | Remove aplicativo e dados associados do monitoramento |
| `POST` | `/api/v1/aso/apps/:id/keywords` | Adiciona palavra-chave e afere o ranking atual na loja |
| `GET` | `/api/v1/aso/apps/:id/keywords` | Lista palavras-chave rastreadas com posições atual, anterior e melhor |
| `POST` | `/api/v1/aso/apps/:id/keywords/:kwId/check`| Força rechecagem imediata do posicionamento de uma palavra-chave |
| `GET` | `/api/v1/aso/apps/:id/keywords/:kwId/history`| Obtém série temporal histórica de rankings (`?days=30`) |
| `DELETE` | `/api/v1/aso/apps/:id/keywords/:kwId` | Desvincula palavra-chave do monitoramento |
| `POST` | `/api/v1/aso/apps/:id/audit` | Executa cálculo da auditoria heurística ASO sob demanda |
| `GET` | `/api/v1/aso/apps/:id/audit/latest` | Obtém o laudo de auditoria mais recente com recomendações |
| `GET` | `/api/v1/aso/apps/:id/audit/history` | Histórico evolutivo de pontuações de auditoria do app |

---

## 4. Cobertura de Testes e Homologação

```
Test Suites: 22 passed, 22 total
Tests:       186 passed, 186 total (100% green)
Snapshots:   0 total
Time:        23.626 s
```

- **4 Novas Suítes de Testes Adicionadas na Fase 13:**
  1. `aso-apps.service.spec.ts`: 6 testes aprovados (cadastro com scraper, bloqueio de duplicidade, reativação, paginação, isolamento de tenant e exclusão).
  2. `aso-keywords.service.spec.ts`: 5 testes aprovados (vinculação com ranking inicial, rechecagem de posição, série temporal e desvinculação).
  3. `aso-audit.service.spec.ts`: 5 testes aprovados (cálculo setorizado de scores, penalização de títulos curtos, geração de recomendações e histórico).
  4. `aso.controller.spec.ts`: 12 testes aprovados (validação de contratos REST, injeção de `TenantId` e delegação aos serviços).

