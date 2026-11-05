# 01. Motor de Coleta e Scraping da Google Play Store (ASO Scraper Engine)

## 1. Visão Geral da Arquitetura

O **Motor de Coleta e Scraping da Google Play Store** é o componente fundamental da **ETAPA 2 — Motor de Inteligência & ASO** da Mobile Growth Platform (MGP). Ele é responsável por extrair, normalizar e catalogar dados públicos da Google Play Store em tempo real para alimentar as ferramentas de auditoria ASO, busca por palavras-chave, espionagem de concorrentes e inteligência competitiva.

```
                           +-------------------------------------+
                           |      PlayScraperController          |
                           |   (Rotas REST /api/v1/aso/scraper)  |
                           +------------------+------------------+
                                              |
                                              v
                           +-------------------------------------+
                           |      PlayScraperEngineService       |
                           +---------+-----------------+---------+
                                     |                 |
                   (Cache First)     v                 v   (Throttling & Retry)
              +---------------------------+       +---------------------------+
              |      AsoCacheService      |       |   AsoRateLimiterService   |
              |  - Redis Cluster / Stand. |       |  - Semáforo Concorrência  |
              |  - Fallback em Memória    |       |  - Espaçamento de Picos   |
              |  - Chaves Padronizadas    |       |  - Backoff Exponencial    |
              +---------------------------+       +-------------+-------------+
                                                                |
                                                                v
                                                  +---------------------------+
                                                  |    google-play-scraper    |
                                                  |   (Google Play Store API) |
                                                  +---------------------------+
```

---

## 2. Componentes e Responsabilidades

### 2.1. `AsoCacheService` (Cache Redis com Degradação Graciosa)
Evita sobrecarga e bloqueios por scraping frequente na Google Play Store através de uma camada distribuída de cache Redis (`ioredis`), dotada de fallback automático e transparente em memória:
- **Resiliência Máxima (Graceful Degradation):** Caso o cluster Redis sofra instabilidade, perda de conectividade ou indisponibilidade, o serviço não derruba a requisição: registra log de advertência e alterna instantaneamente para o armazenamento de cache em memória local.
- **TTLs Diferenciados por Dinâmica de Dados:**
  - `TTL_APP = 86.400s (24h)`: Metadados completos do aplicativo (título, descrição, notas, downloads, prints).
  - `TTL_SEARCH = 21.600s (6h)`: Resultados de pesquisas por palavras-chave.
  - `TTL_SUGGEST = 43.200s (12h)`: Sugestões preditivas do autocomplete.
  - `TTL_TOP_CHARTS = 14.400s (4h)`: Rankings de Top Free, Top Paid e Grossing.
  - `TTL_SIMILAR = 86.400s (24h)`: Aplicativos similares e concorrentes mapeados.
  - `TTL_DEVELOPER = 86.400s (24h)`: Portfólio de aplicativos do desenvolvedor.
  - `TTL_CATEGORIES = 604.800s (7 dias)`: Catálogo oficial de categorias da loja.

- **Chaves Canônicas Padronizadas:**
  - `aso:cache:app:{appId}:{country}:{lang}`
  - `aso:cache:search:{term}:{country}:{lang}:{num}`
  - `aso:cache:suggest:{term}:{country}:{lang}`
  - `aso:cache:top:{category}:{collection}:{country}:{lang}:{num}`
  - `aso:cache:similar:{appId}:{country}:{lang}`
  - `aso:cache:dev:{devId}:{country}:{lang}:{num}`
  - `aso:cache:categories`

### 2.2. `AsoRateLimiterService` (Controle de Taxa e Backoff Exponencial)
Protege as requisições contra restrições de IP (HTTP 429 Too Many Requests) e erros transitórios de rede na Google Play:
- **Controle de Concorrência:** Fila assíncrona baseada em semáforo que limita requisições simultâneas em trânsito (padrão: 3 requisições simultâneas).
- **Espaçamento Mínimo:** Garante intervalo de segurança (padrão: 150ms) entre disparos de scraping.
- **Backoff Exponencial com Jitter:** Em caso de erro temporário (503, 429, timeouts), aplica retry automático com espera progressiva:
  $$\text{Delay} = \text{BaseDelay} \times 2^{\text{tentativa}-1} + \text{jitter}$$
- **Tratamento de 404:** Erros definitivos (como aplicativo inexistente) não realizam retry desnecessário e são propagados imediatamente como `NotFoundException`.

### 2.3. `PlayScraperEngineService` (Engine de Coleta e Normalização)
Consome `google-play-scraper` de forma segura com carregamento dinâmico compatível com módulos ESM, normalizando os payloads da loja em contratos TypeScript estritos:
- `PlayAppMetadata`: Metadados completos com rating, downloads exatos estimados, lista de screenshots, versão mínima Android e suporte a anúncios.
- `PlaySearchResultItem`: Formato conciso e leve para listagens, rankings e buscas rápidas.
- `PlayCategoryItem`: Lista de categorias normalizadas com nome amigável para exibição em interfaces.

---

## 3. Endpoints REST da API (`/api/v1/aso/scraper/*`)

Todas as rotas são protegidas por autenticação JWT (`JwtAuthGuard`):

| Método | Rota | Descrição | Cache TTL |
| :--- | :--- | :--- | :--- |
| `GET` | `/aso/scraper/app/:appId` | Obtém metadados completos de um aplicativo (`?country=br&lang=pt-BR`) | 24 horas |
| `GET` | `/aso/scraper/search` | Pesquisa aplicativos por palavra-chave (`?term=financas&num=20`) | 6 horas |
| `GET` | `/aso/scraper/suggest` | Sugestões preditivas do autocomplete (`?term=what`) | 12 horas |
| `GET` | `/aso/scraper/top-charts` | Rankings por categoria e coleção (`?category=FINANCE&collection=TOP_FREE`) | 4 horas |
| `GET` | `/aso/scraper/categories` | Catálogo de categorias da loja Google Play | 7 dias |
| `GET` | `/aso/scraper/similar/:appId` | Lista aplicativos similares e concorrentes | 24 horas |
| `GET` | `/aso/scraper/developer/:devId` | Portfólio de aplicativos de uma desenvolvedora | 24 horas |

---

## 4. Testes e Homologação da Fase 11

- **Suítes de Testes Unitários:**
  - `aso-cache.service.spec.ts`: Validação de chaves canônicas, gravação/leitura, expiração de TTL, remoção de chaves e padrão `resetPattern()`.
  - `aso-rate-limiter.service.spec.ts`: Validação de métricas, concorrência simultânea, retry com backoff exponencial e curto-circuito em erros 404.
  - `play-scraper-engine.service.spec.ts`: Validação de Cache HIT/MISS, mapeamento de erros 404 para `NotFoundException`, validação de parâmetros e normalização de metadados.
  - `play-scraper.controller.spec.ts`: Validação de controllers, contratos de DTOs e repasse correto de filtros de país, idioma e paginação.
- **Resultados:** 17 suítes executadas, 146 testes automatizados passando (100% green, 0 falhas, 0 regressões).

