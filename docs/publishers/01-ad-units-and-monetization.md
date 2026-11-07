# Painel de Publishers, Configuração de Ad Units e Relatórios de Monetização

Este documento detalha a arquitetura, endpoints REST, contratos de dados e modelos contábeis para a monetização de publishers e gestão de blocos de anúncios (**Ad Units**) na **Mobile Growth Platform (MGP)**, entregue na **Etapa 4 — Fase 24**.

---

## 1. Visão Geral da Arquitetura

O módulo de Ad Units e Monetização de Publishers conecta o inventário dos aplicativos cadastrados pelos desenvolvedores/publishers ao motor de leilão RTB em tempo real (`apps/ad-server`), integrando três pilares:

1. **Isolamento Multi-Tenant Estrito (Zero Data Leakage):**
   - Um bloco de anúncios só pode ser criado para um aplicativo que comprovadamente pertença à organização ativa (`app.organizationId === organizationId`).
   - Qualquer tentativa de consulta, listagem ou mutação de blocos de anúncios pertencentes a outro tenant resulta em HTTP 404 imediato.

2. **Floor eCPM Dinâmico no Leilão RTB:**
   - Cada bloco de anúncios pode definir um preço de reserva mínimo (`floorEcpm` em BRL).
   - O Ad Server Fastify descarta qualquer lance em leilão cujo eCPM ofertado seja inferior ao piso configurado pelo publisher, garantindo a rentabilidade mínima do inventário.

3. **Modelo de Rev-Share e Divisão de Receita:**
   - A plataforma opera sob o padrão de **70% de Revenue Share para o Publisher** e **30% de Take-Rate (Platform Fee)** sobre a receita bruta faturada via leilões RTB e cliques.
   - O relatório analítico calcula o eCPM efetivo realizado:
     $$\text{eCPM Efetivo} = \left(\frac{\text{Receita Líquida do Publisher}}{\text{Impressões Servidas}}\right) \times 1000$$

---

## 2. Modelagem de Dados

### Modelo `AdUnit` (Prisma / PostgreSQL)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `String` (UUID) | Identificador único do bloco de anúncios (usado no SDK Android). |
| `appId` | `String` (UUID) | Aplicativo ao qual o bloco pertence. |
| `name` | `String` | Nome descritivo (ex: "Banner Topo Tela Inicial"). |
| `format` | `AdFormat` | `BANNER`, `NATIVE`, `INTERSTITIAL`, `REWARDED`. |
| `placement` | `String?` | Tag contextual opcional (ex: `home_top`, `game_over_modal`). |
| `floorEcpm` | `Decimal` | Piso mínimo de lance para o leilão RTB (default 0.00). |
| `isActive` | `Boolean` | Flag de ativação (permite pausar ou ativar sem deletar). |
| `createdAt` | `DateTime` | Data de criação. |
| `updatedAt` | `DateTime` | Data da última atualização. |

---

## 3. Endpoints da API REST (`/ad-units`)

Todos os endpoints operam sob autenticação JWT e validação multi-tenant (`x-organization-id` header ou token payload).

| Método | Rota | Descrição | Status HTTP |
| :--- | :--- | :--- | :---: |
| `GET` | `/ad-units` | Lista Ad Units dos aplicativos da organização com filtros e paginação. | 200 |
| `POST` | `/ad-units` | Cria um novo bloco de anúncios vinculado a um App do tenant. | 201 |
| `GET` | `/ad-units/analytics` | Relatório de monetização (receita bruta, split 70%, eCPM e fill rate). | 200 |
| `GET` | `/ad-units/:id` | Detalhes completos da Ad Unit e metadados do App vinculado. | 200 |
| `PATCH` | `/ad-units/:id` | Atualiza propriedades operacionais (floor price, status, nome). | 200 |
| `DELETE` | `/ad-units/:id` | Exclui o bloco de anúncios da organização. | 200 |

---

## 4. Integração no SDK Android (Kotlin)

Cada formato de bloco de anúncios gerado na plataforma possui integração nativa simplificada:

### Banner (`BANNER`):
```kotlin
val banner = findViewById<MgpBannerView>(R.id.mgpBannerView)
banner.loadAd(adUnitId = "UUID_DO_BLOCO")
```

### Tela Cheia (`INTERSTITIAL`):
```kotlin
MGP.loadInterstitial(this, "UUID_DO_BLOCO", object : MgpAdCallback {
    override fun onAdLoaded() {
        MGP.showInterstitial(this@MainActivity)
    }
    override fun onAdClosed() { /* Retomar fluxo */ }
    override fun onAdFailed(error: String) { /* Tratar erro */ }
})
```

### Vídeo Premiado (`REWARDED`):
```kotlin
MGP.loadRewarded(this, "UUID_DO_BLOCO", object : MgpRewardCallback {
    override fun onAdLoaded() {
        MGP.showRewarded(this@MainActivity)
    }
    override fun onUserRewarded(rewardType: String, amount: Int) {
        // Conceder itens com token criptográfico HMAC seguro
    }
    override fun onAdFailed(error: String) { /* Tratar erro */ }
})
```

### Anúncio Nativo (`NATIVE`):
```kotlin
MGP.loadNativeAd(this, "UUID_DO_BLOCO", object : MgpNativeAdCallback {
    override fun onNativeAdLoaded(ad: MgpNativeAd) {
        ad.bindToView(findViewById(R.id.nativeAdContainer))
    }
    override fun onAdFailed(error: String) { /* Tratar erro */ }
})
```
