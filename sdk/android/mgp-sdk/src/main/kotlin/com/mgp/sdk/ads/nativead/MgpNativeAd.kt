package com.mgp.sdk.ads.nativead

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ImageView
import android.widget.TextView
import com.mgp.sdk.MGP
import com.mgp.sdk.ads.AdFormat
import com.mgp.sdk.ads.model.AdError
import com.mgp.sdk.ads.model.AdErrorCode
import com.mgp.sdk.ads.model.AdInteractionListener
import com.mgp.sdk.ads.model.AdRequest
import com.mgp.sdk.ads.model.AdResponse
import com.mgp.sdk.ads.model.CreativeData
import com.mgp.sdk.ads.model.InteractionMetrics
import com.mgp.sdk.ads.model.VisibilityMetrics
import com.mgp.sdk.ads.network.AdHttpClient
import com.mgp.sdk.core.DeviceContextExtractor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.atomic.AtomicBoolean

interface NativeAdLoadCallback {
    fun onAdLoaded(nativeAd: MgpNativeAd)
    fun onAdFailedToLoad(error: AdError)
}

/**
 * Representa um anúncio Nativo entregue pelo Ad Server da MGP.
 * Permite que a aplicação anfitriã renderize o anúncio com o mesmo look & feel da sua interface.
 */
class MgpNativeAd(
    val id: String,
    val creative: CreativeData,
    private val adResponse: AdResponse,
    private val adClient: AdHttpClient
) {
    val title: String get() = creative.title
    val description: String? get() = creative.description
    val imageUrl: String get() = creative.imageUrl
    val iconUrl: String? get() = creative.iconUrl
    val ctaText: String get() = creative.ctaText ?: "Instalar"
    val starRating: Double? get() = creative.starRating
    val sponsorText: String? get() = creative.sponsorText
    val actionUrl: String get() = creative.actionUrl

    private val impressionRecorded = AtomicBoolean(false)
    private val scope = CoroutineScope(Dispatchers.Main)
    private var interactionListener: AdInteractionListener? = null

    fun setInteractionListener(listener: AdInteractionListener?) {
        this.interactionListener = listener
    }

    /**
     * Vincula a view de layout nativa e gerencia cliques e impressões.
     */
    fun registerViewForInteraction(
        container: ViewGroup,
        ctaView: View? = null,
        clickableViews: List<View> = emptyList()
    ) {
        val tokens = adResponse.tokens ?: return

        // Registra impressão única
        if (impressionRecorded.compareAndSet(false, true)) {
            scope.launch(Dispatchers.IO) {
                adClient.recordImpression(
                    impressionToken = tokens.impressionToken,
                    metrics = VisibilityMetrics(viewablePercentage = 100.0, durationMs = 0L)
                )
            }
            interactionListener?.onAdImpression()
        }

        val clickHandler = View.OnClickListener { v ->
            scope.launch(Dispatchers.IO) {
                adClient.recordClick(
                    clickToken = tokens.clickToken,
                    metrics = InteractionMetrics()
                )
            }
            interactionListener?.onAdClicked()

            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(creative.actionUrl)).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                container.context.startActivity(intent)
            } catch (ex: Exception) {
                Log.e("MGP_SDK", "[MgpNativeAd] Falha ao abrir actionUrl nativo", ex)
            }
        }

        ctaView?.setOnClickListener(clickHandler)
        clickableViews.forEach { it.setOnClickListener(clickHandler) }
    }

    companion object {
        @JvmStatic
        fun load(
            context: Context,
            placementId: String,
            callback: NativeAdLoadCallback
        ) {
            val config = MGP.getConfig()
            if (config == null || !MGP.isReady()) {
                callback.onAdFailedToLoad(
                    AdError(
                        code = AdErrorCode.INVALID_REQUEST,
                        message = "MGP SDK não foi inicializado. Chame MGP.initialize() primeiro."
                    )
                )
                return
            }

            val scope = CoroutineScope(Dispatchers.Main)
            scope.launch {
                try {
                    val adClient = AdHttpClient(config)
                    val deviceContext = withContext(Dispatchers.IO) {
                        DeviceContextExtractor(context).extractDeviceContext()
                    }

                    val request = AdRequest(
                        placementId = placementId,
                        format = AdFormat.NATIVE,
                        adUnitWidth = 300,
                        adUnitHeight = 250
                    )

                    val result = withContext(Dispatchers.IO) {
                        adClient.requestAd(
                            request = request,
                            deviceContext = deviceContext,
                            sessionId = MGP.getSessionId()
                        )
                    }

                    result.fold(
                        onSuccess = { response ->
                            if (!response.fill || response.creative == null || response.tokens == null) {
                                callback.onAdFailedToLoad(
                                    AdError(
                                        code = AdErrorCode.NO_FILL,
                                        message = response.reason ?: "Sem preenchimento para anúncio Nativo"
                                    )
                                )
                                return@fold
                            }

                            val nativeAd = MgpNativeAd(
                                id = response.adId ?: "mgp-native",
                                creative = response.creative,
                                adResponse = response,
                                adClient = adClient
                            )
                            callback.onAdLoaded(nativeAd)
                        },
                        onFailure = { throwable ->
                            callback.onAdFailedToLoad(
                                AdError(
                                    code = AdErrorCode.NETWORK_ERROR,
                                    message = throwable.message ?: "Erro de rede no anúncio Nativo",
                                    cause = throwable
                                )
                            )
                        }
                    )
                } catch (ex: Exception) {
                    callback.onAdFailedToLoad(
                        AdError(
                            code = AdErrorCode.INTERNAL_ERROR,
                            message = "Falha crítica ao carregar anúncio Nativo: ${ex.message}",
                            cause = ex
                        )
                    )
                }
            }
        }
    }
}

