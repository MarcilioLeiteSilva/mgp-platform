package com.mgp.sdk.ads.interstitial

import android.app.Activity
import android.app.Dialog
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import com.mgp.sdk.MGP
import com.mgp.sdk.ads.AdFormat
import com.mgp.sdk.ads.model.AdError
import com.mgp.sdk.ads.model.AdErrorCode
import com.mgp.sdk.ads.model.AdInteractionListener
import com.mgp.sdk.ads.model.AdRequest
import com.mgp.sdk.ads.model.AdResponse
import com.mgp.sdk.ads.model.InteractionMetrics
import com.mgp.sdk.ads.model.VisibilityMetrics
import com.mgp.sdk.ads.network.AdHttpClient
import com.mgp.sdk.core.DeviceContextExtractor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

interface InterstitialAdLoadCallback {
    fun onAdLoaded(interstitialAd: MgpInterstitialAd)
    fun onAdFailedToLoad(error: AdError)
}

/**
 * Gerenciador de anúncios Intersticiais (Tela Cheia) do MGP Android SDK.
 *
 * Características:
 * - Renderização em tela cheia via Dialog nativo seguro.
 * - Bloqueio temporizado de fechamento (Skip Offset) configurável (padrão: 5 segundos).
 * - Disparo de impressão garantido na abertura e rastreamento de cliques com redirect.
 */
class MgpInterstitialAd private constructor(
    private val context: Context,
    private val placementId: String,
    private val adResponse: AdResponse,
    private val adClient: AdHttpClient
) {

    private val mainHandler = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private val impressionRecorded = AtomicBoolean(false)

    private var interactionListener: AdInteractionListener? = null
    private var activeDialog: Dialog? = null

    fun setInteractionListener(listener: AdInteractionListener?) {
        this.interactionListener = listener
    }

    fun isLoaded(): Boolean = adResponse.fill && adResponse.creative != null && adResponse.tokens != null

    /**
     * Exibe o anúncio Intersticial em tela cheia na Activity informada.
     */
    fun show(activity: Activity) {
        if (!isLoaded()) {
            Log.w("MGP_SDK", "[MgpInterstitialAd] Tentativa de show() em anúncio não carregado.")
            return
        }

        if (activity.isFinishing || activity.isDestroyed) {
            Log.w("MGP_SDK", "[MgpInterstitialAd] Activity inválida para exibição do Interstitial.")
            return
        }

        val creative = adResponse.creative ?: return
        val tokens = adResponse.tokens ?: return

        val dialog = Dialog(activity, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
        activeDialog = dialog

        val rootLayout = FrameLayout(activity).apply {
            setBackgroundColor(Color.BLACK)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Imagem de tela cheia
        val imageView = ImageView(activity).apply {
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
                Gravity.CENTER
            )
        }
        rootLayout.addView(imageView)

        // Botão / Contador de Fechamento (Skip Offset)
        val skipSeconds = creative.skipOffsetSeconds.coerceAtLeast(0)
        val closeButton = TextView(activity).apply {
            textSize = 14f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#99000000"))
            setPadding(32, 16, 32, 16)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP or Gravity.END
            ).apply {
                topMargin = 48
                rightMargin = 48
            }
        }
        rootLayout.addView(closeButton)

        dialog.setContentView(rootLayout)
        dialog.setCancelable(false)
        dialog.show()

        // Disparo de Impressão imediato na exibição
        if (impressionRecorded.compareAndSet(false, true)) {
            scope.launch(Dispatchers.IO) {
                adClient.recordImpression(
                    impressionToken = tokens.impressionToken,
                    metrics = VisibilityMetrics(viewablePercentage = 100.0, durationMs = 0L)
                )
            }
            interactionListener?.onAdImpression()
        }

        interactionListener?.onAdOpened()

        // Carrega imagem e configura interações
        scope.launch {
            val bitmap = withContext(Dispatchers.IO) {
                downloadBitmap(creative.imageUrl)
            }
            if (bitmap != null) {
                imageView.setImageBitmap(bitmap)
            }

            imageView.setOnClickListener {
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
                    activity.startActivity(intent)
                } catch (ex: Exception) {
                    Log.e("MGP_SDK", "[MgpInterstitialAd] Falha ao abrir actionUrl", ex)
                }
            }

            // Contador de Skip
            var remaining = skipSeconds
            while (remaining > 0) {
                closeButton.text = "Fechar em ${remaining}s"
                kotlinx.coroutines.delay(1000)
                remaining--
            }

            // Habilita fechamento
            closeButton.text = "✕ Fechar"
            closeButton.setBackgroundColor(Color.parseColor("#CC111827"))
            closeButton.setOnClickListener {
                dialog.dismiss()
                activeDialog = null
                interactionListener?.onAdClosed()
            }
        }
    }

    private fun downloadBitmap(urlStr: String): Bitmap? {
        return try {
            val url = URL(urlStr)
            val connection = url.openConnection() as HttpURLConnection
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.doInput = true
            connection.connect()
            connection.inputStream.use { stream ->
                BitmapFactory.decodeStream(stream)
            }
        } catch (ex: Exception) {
            null
        }
    }

    companion object {
        /**
         * Carrega de forma assíncrona um anúncio Intersticial.
         */
        @JvmStatic
        fun load(
            context: Context,
            placementId: String,
            callback: InterstitialAdLoadCallback
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
                        format = AdFormat.INTERSTITIAL,
                        adUnitWidth = 1080,
                        adUnitHeight = 1920
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
                                        message = response.reason ?: "Sem preenchimento para Interstitial"
                                    )
                                )
                                return@fold
                            }

                            val interstitial = MgpInterstitialAd(
                                context = context.applicationContext,
                                placementId = placementId,
                                adResponse = response,
                                adClient = adClient
                            )
                            callback.onAdLoaded(interstitial)
                        },
                        onFailure = { throwable ->
                            callback.onAdFailedToLoad(
                                AdError(
                                    code = AdErrorCode.NETWORK_ERROR,
                                    message = throwable.message ?: "Erro de rede no Interstitial",
                                    cause = throwable
                                )
                            )
                        }
                    )
                } catch (ex: Exception) {
                    callback.onAdFailedToLoad(
                        AdError(
                            code = AdErrorCode.INTERNAL_ERROR,
                            message = "Falha crítica ao carregar Interstitial: ${ex.message}",
                            cause = ex
                        )
                    )
                }
            }
        }
    }
}
