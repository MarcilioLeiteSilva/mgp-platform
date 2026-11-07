# Gestão de Campanhas, Criativos e Segmentação de Público (Audiences & Geo-Targeting)

Este documento descreve a arquitetura, endpoints REST, contratos de dados e regras de negócio para a gestão de campanhas publicitárias e criativos multi-formato na **Mobile Growth Platform (MGP)**, introduzida na **Etapa 4 — Fase 23**.

---

## 1. Visão Geral da Arquitetura

O módulo de campanhas conecta a camada de anunciante (`apps/web` e `apps/api`) ao motor de decisão de lances RTB em tempo real (`apps/ad-server`), integrando três pilares fundamentais:

1. **Isolamento Multi-Tenant Estrito (Zero Data Leakage):**
   - Todas as operações exigem e filtram explicitamente por `organizationId`.
   - Nenhuma campanha ou criativo de uma organização é acessível, visível ou modificável por outra organização.

2. **Integridade Financeira e Verificação Prévia no Ledger Contábil:**
   - Antes de cadastrar ou ativar uma campanha com modelo `PAID`, o sistema valida se a conta de anunciante (`ADVERTISING_CREDITS`) do tenant possui saldo real suficiente (`cachedBalance >= dailyBudget`).
   - Se o saldo for insuficiente, a requisição é rejeitada com erro HTTP 400 informando o saldo atual e o montante requerido.

3. **Validação Operacional de Ativação:**
   - Uma campanha não pode transicionar para o status `ACTIVE` se não possuir **pelo menos um criativo ativo**.
   - O Ad Server Fastify só seleciona e pontua campanhas em estado `ACTIVE` com criativos associados correspondentes ao formato requisitado pela Ad Unit (`BANNER`, `NATIVE`, `INTERSTITIAL`, `REWARDED`).

---

## 2. Modelagem de Dados

### Modelo `Campaign` (Prisma / PostgreSQL)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `String` (UUID) | Identificador único da campanha. |
| `organizationId` | `String` (UUID) | Tenant anunciante proprietário. |
| `name` | `String` | Nome descritivo da campanha. |
| `type` | `CampaignType` | `PAID`, `CROSS_PROMO`, `HOUSE`. |
| `billingModel` | `CampaignBillingModel` | `CPM` (custo por mil) ou `CPC` (custo por clique). |
| `bidAmount` | `Float` | Lance monetário máximo submetido ao leilão RTB. |
| `dailyBudget` | `Float` | Teto diário de gasto em BRL. |
| `totalBudget` | `Float` | Teto total contratado para a campanha. |
| `spentAmount` | `Float` | Montante acumulado já debitado pelo ledger (default 0.0). |
| `status` | `CampaignStatus` | `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`. |
| `targetCountry` | `String` | Código ISO-3166-1 alpha-2 (ex: `BR`). |
| `targetCategories` | `String` | Categorias alvo permitidas ou `ALL`. |
| `frequencyCapPerHour` | `Int` | Limite de impressões por usuário em janela horária (default 3). |
| `priorityTier` | `Int` | Tier de desempate no leilão (1: House, 2: Paid Premium, 3: Paid Standard, etc.). |
| `startDate` | `DateTime?` | Início do período de veiculação. |
| `endDate` | `DateTime?` | Término do período de veiculação. |

### Modelo `Creative` (Prisma / PostgreSQL)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `String` (UUID) | Identificador único do criativo. |
| `campaignId` | `String` (UUID) | Campanha à qual o criativo pertence. |
| `name` | `String?` | Nome do criativo. |
| `format` | `AdFormat` | `BANNER`, `NATIVE`, `INTERSTITIAL`, `REWARDED`. |
| `title` | `String` | Título textual de exibição. |
| `description` | `String?` | Descrição ou corpo textual. |
| `imageUrl` | `String` | URL do banner, capa ou vídeo. |
| `actionUrl` | `String` | URL de clique / deep link de destino. |
| `width` / `height` | `Int?` | Dimensões para banners (ex: 320x50, 300x250). |
| `iconUrl` | `String?` | Ícone do aplicativo (Native Ads). |
| `ctaText` | `String?` | Texto do botão de ação (ex: "Instalar", "Jogar"). |
| `starRating` | `Float?` | Avaliação em estrelas (Native Ads). |
| `sponsorText` | `String?` | Texto do patrocinador (Native Ads). |
| `skipOffsetSeconds`| `Int?` | Segundos para exibição do botão pular (Interstitials). |
| `rewardType` | `String?` | Moeda ou recompensa (ex: `COINS`, `GEMS`). |
| `rewardAmount` | `Int?` | Quantidade entregue (Rewarded Ads). |
| `requiredWatchSeconds` | `Int?` | Duração assistida mínima (Rewarded Ads). |
| `isActive` | `Boolean` | Flag de ativação individual do criativo. |

---

## 3. Endpoints da API REST (`/campaigns`)

Todos os endpoints operam sob autenticação JWT e validação multi-tenant (`x-organization-id` header ou token payload).

| Método | Rota | Descrição | Status HTTP |
| :--- | :--- | :--- | :---: |
| `GET` | `/campaigns` | Lista campanhas da organização com paginação e filtros. | 200 |
| `POST` | `/campaigns` | Cria nova campanha (valida orçamento e saldo em carteira). | 201 |
| `GET` | `/campaigns/:id` | Detalhes completos da campanha e seus criativos. | 200 |
| `PATCH` | `/campaigns/:id` | Atualiza parâmetros operacionais e de lance. | 200 |
| `PATCH` | `/campaigns/:id/status` | Ativa (`ACTIVE`) ou pausa (`PAUSED`) a campanha. | 200 |
| `DELETE` | `/campaigns/:id` | Exclui campanha inativa (proibido excluir se estiver `ACTIVE`). | 200 |
| `GET` | `/campaigns/:id/creatives` | Lista criativos da campanha. | 200 |
| `POST` | `/campaigns/:id/creatives` | Adiciona novo criativo à campanha. | 201 |
| `PATCH` | `/campaigns/:id/creatives/:cId` | Atualiza criativo ou altera flag `isActive`. | 200 |
| `DELETE` | `/campaigns/:id/creatives/:cId` | Remove criativo da campanha. | 200 |

---

## 4. Trilha de Auditoria Contábil e Operacional

Todas as mutações (`createCampaign`, `updateCampaign`, `updateCampaignStatus`, `deleteCampaign`, `addCreative`, `updateCreative`, `deleteCreative`) registram entradas imutáveis na tabela `AuditLog`, contendo:
- `organizationId`
- `userId`
- `action` (ex: `CAMPAIGN_CREATED`, `CAMPAIGN_STATUS_CHANGED`, `CREATIVE_ADDED`)
- `entityType` (`CAMPAIGN` ou `CREATIVE`)
- `entityId`
- `metadata` com diff dos dados antes/depois, IP e User-Agent.

