# Motor de Recomendações e Otimização Automática de Lances (Smart Bidding & Pacing)

Este documento especifica a arquitetura, algoritmos, contratos de dados e rotas operacionais do **Motor de Recomendações e Otimização Automática de Lances** da **Mobile Growth Platform (MGP)**, introduzido na **Etapa 4 — Fase 26**.

---

## 1. Visão Geral e Objetivos

O motor de Smart Bidding e Recomendações tem como objetivo maximizar o retorno sobre investimento (ROI) de anunciantes e a eficiência na alocação de orçamentos no leilão em tempo real (**RTB**):

1. **Smart Bidding Strategies:**
   - `MANUAL`: Lance fixo definido manualmente pelo anunciante.
   - `SMART_PACING`: Algoritmo adapta dinamicamente multiplicadores de lance ao longo do dia para evitar exaustão prematura do orçamento.
   - `TARGET_CPA`: Otimiza a probabilidade de vitória com base no custo por aquisição meta.
   - `MAX_IMPRESSIONS`: Maximiza volume bruto de impressões respeitando o teto orçamentário diário.
   - `MAX_CLICKS`: Prioriza lances com maior taxa esperada de cliques (eCTR).

2. **Algoritmo de Pacing Diário e Horário:**
   - Avalia a curva de gasto às horas $h \in [0, 23]$ comparando com a fração esperada $\frac{h + 1}{24}$.
   - Se o consumo estiver adiantado (`AHEAD`), aplica multiplicador de amortecimento ($0.75x$ a $0.90x$) preservando saldo para horários nobres noturnos.
   - Se o consumo estiver retido (`BEHIND`), eleva o lance ($1.10x$ a $1.25x$) para capturar mais leilões no leilão de segundo preço de Vickrey.

3. **Geração Automatizada de Recomendações Acionáveis:**
   - Avaliação contínua das campanhas ativas do tenant com 5 regras heurísticas e preditivas:
     - `BID_ADJUSTMENT`: Sugere reajuste quando o lance estiver abaixo do piso competitivo.
     - `PACING_OPTIMIZATION`: Sugere alternar para `EVEN` quando o consumo for acelerado.
     - `BUDGET_SCALING`: Sugere aumento do orçamento diário (+30%) quando a campanha entrega 90%+ com alta performance.
     - `CREATIVE_FATIGUE`: Recomenda diversificar formatos (Banner, Interstitial, Rewarded) para elevar CTR.
     - `AUDIENCE_EXPANSION`: Recomenda ampliar segmentação quando a entrega estiver restrita.

4. **Aplicação com 1 Clique (One-Click Apply):**
   - Transação atômica (`$transaction`) que atualiza a campanha, altera o status da recomendação para `APPLIED` e grava a trilha de auditoria contábil e operacional (`AuditLog`).

---

## 2. Modelagem de Dados

### Alterações no Modelo `Campaign`

```prisma
enum BiddingStrategy {
  MANUAL
  TARGET_CPA
  MAX_CLICKS
  MAX_IMPRESSIONS
  SMART_PACING
}

enum PacingMode {
  ACCELERATED
  EVEN
  SMART_DYNAMIC
}
```

Campos adicionados:
- `biddingStrategy`: `BiddingStrategy` (default: `MANUAL`).
- `pacingMode`: `PacingMode` (default: `EVEN`).
- `targetCpa`: `Decimal?` (CPA alvo opcional).
- `autoOptimize`: `Boolean` (flag de otimização contínua automática).

### Novo Modelo `CampaignRecommendation`

```prisma
model CampaignRecommendation {
  id              String                 @id @default(uuid())
  campaignId      String                 @map("campaign_id")
  campaign        Campaign               @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  organizationId  String                 @map("organization_id")
  type            RecommendationType
  priority        RecommendationPriority @default(MEDIUM)
  title           String
  message         String
  suggestedAction String                 @map("suggested_action")
  expectedImpact  String                 @map("expected_impact")
  actionPayload   Json                   @map("action_payload")
  status          RecommendationStatus   @default(PENDING)
  appliedAt       DateTime?              @map("applied_at")
  createdAt       DateTime               @default(now()) @map("created_at")
  updatedAt       DateTime               @updatedAt @map("updated_at")

  @@index([organizationId, status])
  @@index([campaignId, status])
  @@map("campaign_recommendations")
}
```

---

## 3. Endpoints REST da API

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/v1/recommendations` | Lista recomendações ativas filtradas por tenant, status e prioridade |
| `POST` | `/api/v1/recommendations/generate` | Executa o motor heurístico e gera novas oportunidades |
| `POST` | `/api/v1/recommendations/:id/apply` | Aplica a recomendação na campanha atomicamente com 1 clique |
| `POST` | `/api/v1/recommendations/:id/dismiss` | Descarta a recomendação sugerida |
| `PATCH` | `/api/v1/recommendations/campaigns/:id/bidding-strategy` | Atualiza parâmetros de lance inteligente e pacing |
| `POST` | `/api/v1/recommendations/campaigns/:id/simulate-bid` | Retorna curva preditiva de lances e avaliação de pacing |

---

## 4. Auditoria e Rastreabilidade

Todas as alterações de lances, orçamentos e estratégias efetuadas por meio do motor de recomendações geram registros compulsórios na tabela `audit_logs`:
- `action`: `RECOMMENDATION_APPLIED` ou `BID_STRATEGY_UPDATED`.
- `entityType`: `CampaignRecommendation` ou `Campaign`.
- `diffBefore` / `diffAfter`: Armazenamento do estado anterior e das propriedades modificadas.
