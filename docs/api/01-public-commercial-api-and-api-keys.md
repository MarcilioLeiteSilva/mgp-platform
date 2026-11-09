# API Pública Comercial & Gestão de Chaves de API

## 1. Visão Geral (Fase 32 — Etapa 5)

A **Fase 32** implementa a infraestrutura da **API Pública Comercial** da Mobile Growth Platform (MGP). Essa funcionalidade permite que desenvolvedores, agências, sistemas de BI e plataformas de terceiros consumam a inteligência preditiva de ASO, estimativas de downloads e receita, auditoria heurística e tendências de mercado programaticamente.

---

## 2. Autenticação & Segurança de Chaves

### 2.1 Padrão de Chaves e Armazenamento Criptográfico
- **Formato da Chave:** `mgp_live_<48 caracteres hexadecimais aleatórios>`.
- **Prefixo de Identificação:** Os 8 primeiros caracteres (`mgp_live_xxxxxxxx`) são visíveis na interface do tenant para facilitar a identificação da chave.
- **Hash Criptográfico:** Apenas o hash **SHA-256** da chave é armazenado no banco de dados (`api_keys.key_hash`). O segredo em texto puro é retornado **uma única vez** no momento da criação.
- **Revogação Instantânea:** O preenchimento do campo `revoked_at` invalida a chave em tempo real.

### 2.2 Formas de Envio da Chave
Clientes externos podem autenticar suas requisições por dois métodos padronizados:

1. **Cabeçalho Dedicado (Recomendado):**
   ```http
   X-API-Key: mgp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
2. **Cabeçalho Authorization Padrão:**
   ```http
   Authorization: Bearer mgp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

---

## 3. Rate Limiting e Quotas Mensais

A API Comercial implementa proteção em duas camadas gerenciadas pelo `ApiKeyAuthGuard`:

1. **Rate Limiting por Minuto (Janela Deslizante):**
   - Limite padrão: **60 requisições por minuto** por chave.
   - Caso o cliente exceda o limite, a API retorna `HTTP 429 Too Many Requests` com mensagem explicativa e tempo para nova tentativa.
2. **Quota Mensal por Tenant:**
   - Quota padrão inicial: **10.000 requisições/mês**.
   - Contador atômico `quota_used` incrementado a cada chamada válida.
3. **Cabeçalhos de Resposta Informativos:**
   - `X-RateLimit-Limit`: `60`
   - `X-Quota-Used`: Volume consumido no mês atual.
   - `X-Quota-Remaining`: Volume de chamadas restantes até a renovação.

---

## 4. Endpoints da API Pública Comercial (`/api/v1/public/aso`)

Todas as respostas da API pública utilizam o padrão unificado `PublicApiResponseDto<T>`:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "d290f1ee-6c54-4b01-90e6-d701748f0851",
    "timestamp": "2026-11-09T23:30:00.000Z",
    "version": "v1",
    "quotaUsed": 152,
    "quotaRemaining": 9848
  }
}
```

### 4.1 Endpoints Disponíveis

| Método | Endpoint | Escopo Requerido | Descrição |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/public/aso/apps/:appId` | `aso:read` | Consulta metadados consolidados (título, categoria, score, downloads mínimos e desenvolvedor) do app na Google Play Store. |
| `GET` | `/api/v1/public/aso/apps/:appId/estimates` | `estimates:read` | Projeções preditivas de downloads e faturamento financeiro com bandas de confiança (Pareto/Power-Law) em janela de 1 a 90 dias. |
| `GET` | `/api/v1/public/aso/trends/categories/:category` | `trends:read` | Tendências setoriais, índice de tração da categoria e top aplicativos em rápida ascensão (*Breakouts*). |
| `GET` | `/api/v1/public/aso/keywords/ranking` | `aso:read` | Consulta a posição orgânica exata de um aplicativo para uma determinada palavra-chave de busca. |

---

## 5. Endpoints de Gestão para o Dashboard Privado (`/api/v1/api-keys`)

Protegidos por autenticação de usuário `JwtAuthGuard` e isolamento `TenantGuard`:

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `POST` | `/api/v1/api-keys` | Cria nova chave comercial retornando `plainTextKey` uma única vez. |
| `GET` | `/api/v1/api-keys` | Lista chaves da organização com métricas de consumo e status. |
| `GET` | `/api/v1/api-keys/stats` | Resumo estatístico de chaves ativas, revogadas e consumo da quota mensal. |
| `POST` | `/api/v1/api-keys/:id/revoke` | Revoga imediatamente a chave informada. |

---

## 6. Painel de Desenvolvedores no Frontend

Disponibilizado na rota [`/developers`](file:///f:/mobile_growth/apps/web/src/app/(dashboard)/developers/page.tsx):
- **Cards de Métricas:** Quota utilizada vs. total, chaves ativas e taxa por minuto.
- **Tabela de Credenciais:** Visão completa com status, prefixo, escopos e ação de revogação.
- **Modal de Criação Segura:** Seleção de escopos granulares e aviso de segurança para cópia única da chave secreta.
- **Guia Interativo de Código:** Snippets funcionais prontos para copiar em **cURL**, **Node.js** e **Python**.
