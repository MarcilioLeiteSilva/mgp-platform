# 05. Padrões de API REST e Contratos de Comunicação

## 1. Diretrizes Globais da API REST

A API principal da MGP é construída sobre convenções RESTful estritas com documentação viva gerada via **Swagger / OpenAPI 3.0** disponível na rota `/api/docs`.

* **Prefixo Global:** `/api/v1`
* **Formato de Dados:** Exclusivamente `application/json` (UTF-8).
* **Autenticação:** Cabeçalho padrão `Authorization: Bearer <access_token>` para rotas do Dashboard, e cabeçalhos dedicados (`X-MGP-App-ID`, `X-MGP-SDK-Key`) para rotas públicas do SDK móvel.

---

## 2. Envelope Padrão de Respostas

Para assegurar previsibilidade aos clientes frontend e SDKs, todas as respostas seguem uma estrutura padronizada:

### 2.1. Resposta de Sucesso (Item Único ou Ação)
```json
{
  "success": true,
  "data": {
    "id": "7f0980cb-ec93-4a0b-936d-1bf9546059e1",
    "name": "Futebol Ao Vivo Placar",
    "packageName": "com.exemplo.futebol",
    "platform": "ANDROID",
    "createdAt": "2026-11-01T20:00:00.000Z"
  }
}
```

### 2.2. Resposta de Sucesso Paginada (Listagens)
```json
{
  "success": true,
  "data": [
    { "id": "uuid-1", "name": "App 1" },
    { "id": "uuid-2", "name": "App 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### 2.3. Resposta de Erro
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Parâmetros de requisição inválidos.",
    "details": [
      {
        "field": "packageName",
        "issue": "Formato de identificador de pacote Android inválido."
      }
    ]
  },
  "timestamp": "2026-11-01T20:25:00.000Z",
  "path": "/api/v1/apps"
}
```

---

## 3. Catálogo de Códigos de Status HTTP

* `200 OK`: Requisição processada com sucesso retornando dados.
* `201 Created`: Novo recurso criado com sucesso.
* `204 No Content`: Ação realizada com sucesso sem corpo de retorno (usado em eventos de telemetria).
* `400 Bad Request`: Payload malformado ou erro genérico de requisição.
* `401 Unauthorized`: Token JWT ausente, expirado ou inválido.
* `403 Forbidden`: Usuário autenticado não possui permissão para o recurso ou organização solicitada.
* `404 Not Found`: Recurso não localizado dentro do tenant atual.
* `409 Conflict`: Conflito de estado (ex: pacote já cadastrado na plataforma).
* `422 Unprocessable Entity`: Erros semânticos de validação nos campos do DTO.
* `429 Too Many Requests`: Limite de taxa (Rate Limit) excedido.
* `500 Internal Server Error`: Falha interna não tratada (registrada imediatamente com trace no log).

---

## 4. Contratos do Ad Server (`apps/ad-server`)

O motor de anúncios possui endpoints dedicados otimizados para máxima taxa de throughput e payload enxuto.

### 4.1. Solicitação de Anúncio (`POST /ads/request`)
**Headers:**
* `X-MGP-App-ID`: UUID do aplicativo cadastrado.
* `X-MGP-SDK-Key`: Chave pública de inicialização do SDK.

**Corpo da Requisição (Payload):**
```json
{
  "adUnitId": "adunit_home_banner_01",
  "format": "BANNER",
  "placement": "home_screen",
  "device": {
    "platform": "ANDROID",
    "osVersion": "14",
    "deviceModel": "Pixel 7",
    "language": "pt-BR",
    "country": "BR",
    "advertisingId": "38400000-8cf0-11bd-b23e-10b96e40000d",
    "isLimitAdTracking": false
  },
  "sdkVersion": "1.0.0"
}
```

**Resposta do Servidor (`200 OK` com Anúncio Preenchido):**
```json
{
  "requestId": "req_a982f10b83",
  "fill": true,
  "campaignId": "cmp_847120a1",
  "campaignType": "PAID",
  "creative": {
    "id": "crt_991823",
    "type": "BANNER",
    "width": 320,
    "height": 50,
    "title": "Aprenda Idiomas Rápido",
    "description": "Comece a praticar inglês hoje mesmo!",
    "imageUrl": "https://cdn.mgp.com.br/creatives/crt_991823.png",
    "actionUrl": "https://ads.mgp.com.br/click/track?t=clk_token_signature_here"
  },
  "tracking": {
    "impressionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token_payload.signature",
    "expiresAt": "2026-11-01T20:30:00Z"
  }
}
```

**Resposta quando não há preenchimento (`200 OK` No-Fill):**
```json
{
  "requestId": "req_a982f10b84",
  "fill": false,
  "reason": "NO_ELIGIBLE_CAMPAIGN"
}
```

### 4.2. Registro de Impressão Renderizada (`POST /events/impression`)
**Payload:**
```json
{
  "impressionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "nonce": "a78912bc-8123-4819-bb12-984123512399",
  "renderedAt": "2026-11-01T20:25:30.120Z",
  "visibilityMetrics": {
    "viewablePercentage": 100,
    "durationMs": 1200
  }
}
```
**Resposta:** `204 No Content` (Processado imediatamente para fila Redis).

