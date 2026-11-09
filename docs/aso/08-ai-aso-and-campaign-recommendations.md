# Motor de Recomendações de ASO & Campanhas com Inteligência Artificial

## 1. Visão Geral (Fase 31 — Etapa 5)

A Fase 31 implementa o motor inteligente de recomendações estratégicas para ASO (App Store Optimization) e aquisição de usuários (Campanhas no Ad Server). Combinando análise heurística de metadados, processamento de linguagem natural e modelos preditivos, o sistema gera sugestões otimizadas respeitando rigorosamente as diretrizes da **Google Play Store**.

---

## 2. Restrições e Limites Regulatórios da Play Store

A IA implementa validação estrita e truncamento defensivo com base nas políticas oficiais da Google Play:

| Campo Metadado | Limite Máximo | Impacto no Algoritmo de Indexação |
| :--- | :--- | :--- |
| **Título do App (`title`)** | **30 caracteres** | Peso máximo na busca orgânica. Palavras-chave no início aumentam indexação e visibilidade. |
| **Descrição Curta (`shortDescription`)** | **80 caracteres** | Elemento de alta conversão visível acima da dobra na listagem da loja. |
| **Descrição Longa (`longDescription`)** | **4.000 caracteres** | Formatação por tópicos e repetição semântica natural sem keyword stuffing. |
| **Headlines de Campanha** | **30 caracteres** | Compatibilidade direta com criativos nos formatos Intersticial e Banner. |

---

## 3. Modalidades de Recomendação Suportadas

O motor de IA atende a 5 casos de uso especializados:

1. **`TITLE_OPTIMIZATION`**:
   - Gera variantes combinando o nome do app com palavras-chave prioritárias e de alto volume.
   - Garante que nenhuma variante ultrapasse 30 caracteres.
   - Fornece pontuação de impacto ($0-100$) e justificativa técnica de posicionamento.

2. **`DESCRIPTION_OPTIMIZATION`**:
   - Produz descrição curta persuasiva de até 80 caracteres.
   - Estrutura tópicos de destaque (bullet points e emojis discretos) para a descrição longa, aumentando a retenção do usuário.

3. **`KEYWORD_EXPANSION`**:
   - Mapeia termos correlatos de cauda longa (long-tail keywords) e termos com intenção explícita de busca (*high intent*).
   - Estima volume e dificuldade para orientar a expansão semântica.

4. **`CAMPAIGN_STRATEGY`**:
   - Recomenda calibragem de lances de eCPM e CPC para competir com eficiência no leilão Vickrey RTB de segundo preço do Ad Server.
   - Sugere públicos-alvo e canais de inventário mais propensos à conversão.

5. **`CREATIVE_COPY`**:
   - Redige chamadas para ação (CTAs) em tom persuasivo, profissional, descontraído ou técnico.
   - Otimiza títulos para criativos de alta taxa de cliques (CTR).

---

## 4. Modelagem de Dados no Prisma

```prisma
enum AsoAiRecommendationType {
  TITLE_OPTIMIZATION
  DESCRIPTION_OPTIMIZATION
  KEYWORD_EXPANSION
  CAMPAIGN_STRATEGY
  CREATIVE_COPY
}

enum AsoAiRecommendationStatus {
  ACTIVE
  APPLIED
  DISMISSED
}

model AsoAiRecommendation {
  id             String                    @id @default(uuid())
  organizationId String
  asoAppId       String?
  type           AsoAiRecommendationType
  status         AsoAiRecommendationStatus @default(ACTIVE)
  category       String?
  targetKeywords String[]                  @default([])
  inputContext   Json?
  suggestionsJson Json
  modelUsed      String                    @default("heuristic-ai-v1")
  appliedAt      DateTime?
  createdAt      DateTime                  @default(now())
  updatedAt      DateTime                  @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  asoApp       AsoApp?      @relation(fields: [asoAppId], references: [id], onDelete: Cascade)

  @@index([organizationId, asoAppId])
  @@index([organizationId, status])
  @@map("aso_ai_recommendations")
}
```

---

## 5. Endpoints REST da API

Todos os endpoints operam sob autenticação JWT e isolamento rigoroso por organização (`x-organization-id`):

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/v1/aso/apps/:id/ai/recommendations/generate` | Gera recomendações de IA com base no tipo e tom solicitados. |
| `GET` | `/api/v1/aso/apps/:id/ai/recommendations` | Lista o histórico de recomendações do app filtrando por tipo/status. |
| `POST` | `/api/v1/aso/ai/recommendations/:id/apply` | Aplica uma sugestão específica (atualizando o app quando título) e marca como `APPLIED`. |
| `POST` | `/api/v1/aso/ai/recommendations/:id/dismiss` | Descarta a recomendação alterando seu status para `DISMISSED`. |

---

## 6. Interface de Usuário no Frontend

O componente `AiRecommendationsPanel` foi integrado na página de detalhes do aplicativo (`/aso/[id]`):
- **Estúdio de IA com Seletor Interativo**: Modalidade de recomendação, tom de voz e palavras-chave focais opcionais.
- **Visualizador Antes vs. Depois**: Mostra valor atual do metadado e sugestão otimizada com botão de copiar para clipboard.
- **Barra de Conformidade de Caracteres**: Indicador em tempo real verificando limites estritos (30 chars título / 80 chars descrição curta).
- **Ações Rápidas**: Botão para aplicar a sugestão diretamente no app e descartar recomendações indesejadas.
