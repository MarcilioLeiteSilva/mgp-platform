package com.mgp.sdk.ads.model

import com.mgp.sdk.ads.AdFormat

/**
 * Modelos de precificação aceitos pelo Ad Server da MGP.
 */
enum class PricingModel(val code: String) {
    CPM("CPM"),
    CPC("CPC"),
    CPI("CPI");

    companion object {
        fun fromCode(code: String): PricingModel =
            values().firstOrNull { it.code.equals(code, ignoreCase = true) } ?: CPM
    }
}

/**
 * Códigos de erro padronizados para falhas no ciclo de vida dos anúncios.
 */
enum class AdErrorCode(val code: Int, val description: String) {
    NETWORK_ERROR(1001, "Falha de conexão com o Ad Server"),
    NO_FILL(1002, "Nenhum anúncio disponível para os critérios solicitados"),
    INVALID_REQUEST(1003, "Parâmetros da requisição inválidos ou chave SDK ausente"),
    AD_EXPIRED(1004, "O anúncio carregado expirou antes da exibição"),
    TIMEOUT(1005, "Tempo limite excedido na requisição do anúncio"),
    INTERNAL_ERROR(1999, "Erro interno no processamento do anúncio");
}

data class AdError(
    val code: AdErrorCode,
    val message: String,
    val cause: Throwable? = null
)

/**
 * Parâmetros de requisição enviados ao Ad Server (`POST /ads/request`).
 */
data class AdRequest(
    val placementId: String,
    val format: AdFormat,
    val adUnitWidth: Int = 320,
    val adUnitHeight: Int = 50,
    val keywords: List<String> = emptyList(),
    val customTargeting: Map<String, String> = emptyMap()
)

/**
 * Metadados detalhados do criativo publicitário entregue pelo Ad Server.
 */
data class CreativeData(
    val id: String,
    val format: AdFormat,
    val title: String,
    val description: String?,
    val imageUrl: String,
    val actionUrl: String,
    val width: Int,
    val height: Int,
    val iconUrl: String? = null,
    val ctaText: String? = "Instalar",
    val starRating: Double? = null,
    val sponsorText: String? = null,
    val skipOffsetSeconds: Int = 5,
    val rewardType: String? = null,
    val rewardAmount: Int? = null,
    val requiredWatchSeconds: Int = 15,
    val htmlContent: String? = null
)

/**
 * Informações de precificação e leilão (RTB).
 */
data class PricingData(
    val model: PricingModel,
    val bidAmount: Double,
    val clearingPrice: Double? = null,
    val currency: String = "BRL"
)

/**
 * Tokens criptográficos assinados via HMAC-SHA256 gerados pelo Ad Server.
 */
data class AdTokens(
    val impressionToken: String,
    val clickToken: String,
    val rewardToken: String? = null,
    val expiresAt: String
)

/**
 * Resposta estruturada retornada pelo Ad Server.
 */
data class AdResponse(
    val requestId: String,
    val fill: Boolean,
    val adId: String? = null,
    val format: AdFormat? = null,
    val creative: CreativeData? = null,
    val pricing: PricingData? = null,
    val tokens: AdTokens? = null,
    val reason: String? = null
)

/**
 * Métricas de visualização para confirmação de impressão (Viewability).
 */
data class VisibilityMetrics(
    val viewablePercentage: Double,
    val durationMs: Long
)

/**
 * Métricas de interação do usuário ao clicar no anúncio.
 */
data class InteractionMetrics(
    val touchX: Float? = null,
    val touchY: Float? = null,
    val durationBeforeClickMs: Long? = null
)

/**
 * Recompensa concedida ao usuário após a conclusão de anúncio Rewarded.
 */
data class RewardData(
    val rewardType: String,
    val rewardAmount: Int,
    val transactionId: String
)

// ==============================================================================
// Listeners e Callbacks de Ciclo de Vida
// ==============================================================================

/**
 * Callback de carregamento de anúncios.
 */
interface AdLoadListener {
    fun onAdLoaded(adId: String)
    fun onAdFailedToLoad(error: AdError)
}

/**
 * Callback de interação geral (exibição, clique, fechamento).
 */
interface AdInteractionListener {
    fun onAdImpression()
    fun onAdClicked()
    fun onAdOpened() {}
    fun onAdClosed() {}
}

/**
 * Callback específico para anúncios recompensados (Rewarded Ads).
 */
interface OnUserEarnedRewardListener {
    fun onUserEarnedReward(reward: RewardData)
}
