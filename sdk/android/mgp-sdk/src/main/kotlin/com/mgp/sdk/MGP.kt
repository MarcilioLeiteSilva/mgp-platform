package com.mgp.sdk

import android.content.Context
import android.util.Log
import com.mgp.sdk.core.MgpLifecycleTracker
import com.mgp.sdk.telemetry.TelemetryEventType
import com.mgp.sdk.telemetry.TelemetryManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Ponto de entrada central do Mobile Growth Platform (MGP) Android SDK.
 *
 * Exemplo de Inicialização no Application do host:
 * ```kotlin
 * class MyApp : Application() {
 *     override fun onCreate() {
 *         super.onCreate()
 *         val config = MgpConfig.Builder("mgp_live_sdk_chave")
 *             .setDebugMode(BuildConfig.DEBUG)
 *             .build()
 *         MGP.initialize(this, config)
 *     }
 * }
 * ```
 */
object MGP {

    private val isInitialized = AtomicBoolean(false)
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    private var config: MgpConfig? = null
    private var telemetryManager: TelemetryManager? = null
    private var lifecycleTracker: MgpLifecycleTracker? = null

    /**
     * Inicializa o SDK de forma assíncrona e não-bloqueante.
     * Libera o Main Thread imediatamente (<10ms).
     */
    @JvmStatic
    fun initialize(context: Context, config: MgpConfig) {
        if (isInitialized.getAndSet(true)) {
            Log.w("MGP_SDK", "[Core] SDK já inicializado previamente. Ignorando chamada redundante.")
            return
        }

        val appContext = context.applicationContext
        this.config = config

        if (config.debugMode) {
            Log.i("MGP_SDK", "[Core] Inicializando MGP Android SDK v0.1.0 para key: ${config.sdkKey.take(8)}...")
        }

        val telemetry = TelemetryManager(appContext, config)
        this.telemetryManager = telemetry

        val tracker = MgpLifecycleTracker(config, telemetry)
        this.lifecycleTracker = tracker
        tracker.startTracking()

        // Disparo assíncrono de inicialização e evento de abertura a frio (APP_OPEN)
        scope.launch {
            if (config.autoCollectLifecycle) {
                telemetry.enqueueEvent(
                    eventType = TelemetryEventType.APP_OPEN,
                    sessionId = tracker.getCurrentSessionId(),
                    properties = mapOf(
                        "sdkVersion" to "0.1.0",
                        "coldStart" to true
                    )
                )
            }
        }
    }

    /**
     * Envia um evento customizado de telemetria e conversão.
     */
    @JvmStatic
    fun trackEvent(eventName: String, properties: Map<String, Any?> = emptyMap()) {
        val telemetry = telemetryManager
        val tracker = lifecycleTracker
        if (telemetry == null || tracker == null) {
            Log.w("MGP_SDK", "[Core] Tentativa de trackEvent antes de MGP.initialize(). Ignorando: $eventName")
            return
        }

        val eventProperties = properties.toMutableMap()
        eventProperties["customEventName"] = eventName

        telemetry.enqueueEvent(
            eventType = TelemetryEventType.CUSTOM_EVENT,
            sessionId = tracker.getCurrentSessionId(),
            properties = eventProperties
        )
    }

    /**
     * Força a sincronização imediata de todos os eventos acumulados no buffer local.
     */
    @JvmStatic
    fun flush() {
        telemetryManager?.flushAsync()
    }

    /**
     * Retorna o identificador da sessão ativa atual.
     */
    @JvmStatic
    fun getSessionId(): String? = lifecycleTracker?.getCurrentSessionId()

    /**
     * Retorna a quantidade de eventos aguardando transmissão no buffer local.
     */
    @JvmStatic
    fun getPendingTelemetryCount(): Long = telemetryManager?.getPendingCount() ?: 0L

    /**
     * Retorna a configuração ativa do SDK.
     */
    @JvmStatic
    fun getConfig(): MgpConfig? = config

    /**
     * Retorna a versão oficial de release do SDK.
     */
    @JvmStatic
    fun getVersion(): String = "0.1.0"

    /**
     * Indica se o SDK já foi devidamente inicializado.
     */
    @JvmStatic
    fun isReady(): Boolean = isInitialized.get()

    // ==============================================================================
    // Métodos Utilitários de Anúncios (Ad Delivery Helpers)
    // ==============================================================================

    /**
     * Carrega um anúncio Intersticial para exibição posterior em tela cheia.
     */
    @JvmStatic
    fun loadInterstitial(
        context: Context,
        placementId: String,
        callback: com.mgp.sdk.ads.interstitial.InterstitialAdLoadCallback
    ) {
        com.mgp.sdk.ads.interstitial.MgpInterstitialAd.load(context, placementId, callback)
    }

    /**
     * Carrega um anúncio Recompensado (Rewarded Ad) para concessão de moedas/benefícios.
     */
    @JvmStatic
    fun loadRewarded(
        context: Context,
        placementId: String,
        callback: com.mgp.sdk.ads.rewarded.RewardedAdLoadCallback
    ) {
        com.mgp.sdk.ads.rewarded.MgpRewardedAd.load(context, placementId, callback)
    }

    /**
     * Carrega um anúncio Nativo para customização livre de UI.
     */
    @JvmStatic
    fun loadNativeAd(
        context: Context,
        placementId: String,
        callback: com.mgp.sdk.ads.nativead.NativeAdLoadCallback
    ) {
        com.mgp.sdk.ads.nativead.MgpNativeAd.load(context, placementId, callback)
    }
}
