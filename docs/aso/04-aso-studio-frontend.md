# Especificação Técnica: Interface Visual do ASO Studio (Fase 15)

Este documento detalha a implementação da interface do usuário do **ASO Studio** (`apps/web`), construída sobre o **Next.js 14 App Router**, **Tailwind CSS** e **Lucide React**, consumindo os serviços e endpoints REST desenvolvidos nas Fases 11, 13 e 14.

---

## 1. Topologia de Rotas e Navegação

O ASO Studio está integrado ao Shell de Dashboard autenticado e multi-tenant:

| Rota | Componente | Finalidade |
|---|---|---|
| `/aso` | `AsoStudioPage` | Painel geral de catálogo de aplicativos, concorrentes em benchmarking, KPIs e explorador ao vivo da Google Play Store. |
| `/aso/[id]` | `AsoAppDetailPage` | Painel detalhado do aplicativo monitorado: tabela de palavras-chave, gráfico de evolução temporal, auditoria heurística ASO e galeria de screenshots. |

---

## 2. Componentes Especializados (`apps/web/src/components/aso/`)

### 2.1. Mostrador de Auditoria (`AuditGauge`)
- **Visual Circular (Gauge):** Renderizado com SVG dinâmico calculando `strokeDashoffset` proporcional ao score geral (0 a 100).
- **Indicadores de Status:** "Excelente" ($\ge 90$), "Bom" ($80-89$), "Oportunidades de Melhoria" ($60-79$), "Otimização Crítica" ($< 60$).
- **Desdobramento por 6 Fatores com Barras de Progresso:**
  1. Título do App (peso 25%)
  2. Descrição Curta (peso 15%)
  3. Descrição Completa (peso 20%)
  4. Ícone de Alta Resolução (peso 10%)
  5. Screenshots & Mídia (peso 15%)
  6. Avaliações & Prova Social (peso 15%)

### 2.2. Gráfico Temporal de Rankings (`RankingChart`)
- **Eixo Y Invertido:** Segue o padrão universal de SEO/ASO em que a posição **#1 fica no topo do gráfico** e posições inferiores ficam na base.
- **Área Sombreada e Gradiente:** Curva poligonal com preenchimento em gradiente translúcido azul.
- **Cálculo de Variação:** Exibe a tendência do período (+ subida em verde, - queda em vermelho, = estabilidade).
- **Pontos de Dados e Datas:** Rótulos nos extremos e pontos centrais.

### 2.3. Modal de Adicionar Aplicativo (`AddAppModal`)
- **Modo de Busca ao Vivo:** Consulta `/api/v1/aso/scraper/search` na Google Play Store com exibição de resultados em tempo real contendo ícone, título, desenvolvedor e nota média.
- **Modo Manual:** Permite digitar diretamente o `packageId` (ex: `com.nu.production`).
- **Classificação:** Suporta marcação como Aplicativo Principal ou Concorrente (com vínculo opcional ao app alvo).

### 2.4. Modal de Palavra-Chave (`AddKeywordModal`)
- **Sugestões em Tempo Real:** Conforme o usuário digita, consulta `/api/v1/aso/scraper/suggest` e apresenta chips clicáveis com os termos populares mais pesquisados na Play Store.
- **Classificação por Tags:** `Core`, `Marca`, `Concorrente`, `Recurso`.

### 2.5. Telemetria Operacional (`QueueStatusBadge`)
- Consulta periódica a `/api/v1/aso/sync/metrics` informando se há workers BullMQ processando tarefas ativas ou se a fila está ociosa.

---

## 3. Fluxo de Dados e Integração Multi-Tenant

Todas as requisições utilizam o cliente HTTP centralizado ([`apps/web/src/lib/api.ts`](../apps/web/src/lib/api.ts)):
1. **Token JWT:** Injetado automaticamente via `Authorization: Bearer <token>`.
2. **Contexto de Organização:** Injetado via cabeçalho `X-Organization-Id` com base no tenant ativo do `auth-context.tsx`.
3. **Sem Dados Fictícios:** Toda informação exibida em tela provém estritamente do banco de dados relacional e das coletas na loja.

---

## 4. Evidências de Qualidade
- **Compilação Next.js:** Compilado com sucesso (`next build` — 12 rotas estáticas e dinâmicas geradas sem erros).
- **Consistência Visual:** Tema escuro harmonizado com o restante do Dashboard MGP e layout NOC.

