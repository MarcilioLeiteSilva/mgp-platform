# 01 — Motor de Planos SaaS, Quotas Dinâmicas e Monetização por Assinatura

Este documento detalha a arquitetura, modelo de dados, catálogo de planos, controle de quotas em tempo real e rotas de contratação do subsistema SaaS da **Mobile Growth Platform (MGP)**, introduzido na **Fase 33**.

---

## 1. Visão Geral da Monetização

A **Mobile Growth Platform** opera no modelo SaaS (*Software as a Service*) B2B com precificação em níveis (*tiered pricing*) e cobrança recorrente mensal ou anual (com **20% de desconto** no ciclo anual).

O ecossistema é desenhado para permitir experimentação gratuita imediata (Tier `FREE`) e expansão progressiva conforme o cliente escala seus aplicativos, volume de palavras-chave rastreadas e automações via API comercial.

---

## 2. Matriz de Planos e Limites Operacionais

| Recurso / Cota | FREE | STARTER | PRO *(Recomendado)* | BUSINESS |
| :--- | :--- | :--- | :--- | :--- |
| **Preço Mensal** | **R$ 0** | **R$ 49 / mês** | **R$ 149 / mês** | **R$ 399 / mês** |
| **Preço Anual** | **R$ 0** | **R$ 39 / mês** (R$ 468/ano) | **R$ 119 / mês** (R$ 1.428/ano) | **R$ 319 / mês** (R$ 3.828/ano) |
| **Desconto Anual** | 0% | 20% | 20% | 20% |
| **Apps Monitorados** | 1 app | 3 apps | 10 apps | 50 apps |
| **Keywords Rastreáveis** | 5 keywords | 25 keywords | 100 keywords | 500 keywords |
| **Chamadas API / mês** | 500 chamadas | 5.000 chamadas | 25.000 chamadas | 100.000 chamadas |
| **Membros da Equipe** | 1 usuário | 3 usuários | 10 usuários | Ilimitados |
| **Rate Limit da API** | 60 req/min | 60 req/min | 120 req/min | 300 req/min |
| **Recomendações IA** | Básico (3/mês) | Padrão (20/mês) | **Ilimitado** | **Ilimitado** |
| **Smart Bidding** | Não | Não | **Sim** | **Sim** |
| **Suporte** | Comunidade | E-mail standard | E-mail prioritário | SLA 24/7 + Gerente Dedicado |

---

## 3. Modelagem de Dados (Prisma ORM)

### Enums
- **`PlanTier`**: `FREE`, `STARTER`, `PRO`, `BUSINESS`
- **`SubscriptionStatus`**: `ACTIVE`, `TRIALING`, `PAST_DUE`, `CANCELED`, `UNPAID`
- **`BillingCycle`**: `MONTHLY`, `YEARLY`

### Modelo `Subscription`
```prisma
model Subscription {
  id                 String             @id @default(uuid())
  organizationId     String             @unique @map("organization_id")
  organization       Organization       @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  plan               PlanTier           @default(FREE)
  status             SubscriptionStatus @default(ACTIVE)
  billingCycle       BillingCycle       @default(MONTHLY) @map("billing_cycle")
  currentPeriodStart DateTime           @default(now()) @map("current_period_start")
  currentPeriodEnd   DateTime           @map("current_period_end")
  canceledAt         DateTime?          @map("canceled_at")
  createdAt          DateTime           @default(now()) @map("created_at")
  updatedAt          DateTime           @updatedAt @map("updated_at")

  @@index([organizationId])
  @@index([plan, status])
  @@map("subscriptions")
}
```

Cada `Organization` possui uma relação `1:1` opcional com `Subscription`. Caso a organização ainda não possua registro no banco, o `PlansService` auto-inicializa um registro `FREE` com vigência de 30 dias na primeira consulta.

---

## 4. Arquitetura de Serviços Backend (`apps/api`)

### `PlansService`
O serviço é responsável por:
1. **Catálogo de Planos (`getPlansCatalog`)**: Expõe todos os planos com preços mensais, anuais e lista completa de limites/benefícios.
2. **Auto-inicialização (`getOrganizationPlan`)**: Garante que qualquer organização válida tenha um plano ativo.
3. **Consumo de Quotas em Tempo Real (`calculateUsage`)**:
   - Apps cadastrados: consulta contagem real em `AsoApp` filtrado por `organizationId`.
   - Palavras-chave monitoradas: contagem real em `AsoTrackedKeyword`.
   - Membros da organização: contagem real em `User` vinculados à organização.
   - Chamadas de API pública: soma das chamadas registradas nas `ApiKey` da organização no mês corrente.
4. **Upgrade / Downgrade (`subscribeOrChangePlan`)**: Altera o plano e ciclo de faturamento, calculando novo `currentPeriodEnd` (30 dias para mensal, 365 dias para anual) e resetando eventuais flags de cancelamento.
5. **Cancelamento Elegante (`cancelSubscription`)**: Registra a data de cancelamento (`canceledAt`) sem cortar o acesso imediato. O plano permanece ativo e funcional até `currentPeriodEnd`.
6. **Guard de Quotas (`checkQuota`)**: Método utilitário para validação prévia antes de criar novos recursos:
   ```typescript
   await this.plansService.checkQuota(organizationId, 'maxTrackedKeywords', 1);
   ```

---

## 5. Endpoints REST da API

| Método | Rota | Autenticação | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/plans` | Opcional | Retorna o catálogo público de todos os planos e preços |
| `GET` | `/api/v1/plans/current` | JWT + Tenant | Retorna o plano atual da organização e o consumo de quotas em tempo real |
| `POST` | `/api/v1/plans/subscribe` | JWT + Tenant | Realiza contratação, upgrade ou alteração de ciclo de faturamento |
| `POST` | `/api/v1/plans/cancel` | JWT + Tenant | Cancela a renovação automática da assinatura |

---

## 6. Interface Web (`apps/web`)

A página `/plans` (`apps/web/src/app/(dashboard)/plans/page.tsx`) oferece:
- **Resumo de Consumo de Quotas**: Barras de progresso com porcentagens visuais para Aplicativos, Keywords, Chamadas de API e Membros da Equipe.
- **Toggle Mensal / Anual**: Switch intuitivo destacando o desconto de **20% OFF** no faturamento anual.
- **Grade Comparativa**: 4 cartões com precificação dinâmica, badges de status (*Plano Atual*, *Recomendado*) e listagem categorizada de recursos.
- **Modal de Confirmação**: Feedback detalhado antes de efetivar upgrades, downgrades ou cancelamento.
- **Sidebar Integration**: Acesso direto via ícone de cartão de crédito no menu lateral da plataforma.

