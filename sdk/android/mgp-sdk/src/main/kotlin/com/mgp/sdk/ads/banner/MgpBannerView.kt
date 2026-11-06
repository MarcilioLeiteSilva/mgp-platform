package com.mgp.sdk.ads.banner

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.AttributeSet
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.ProgressBar
import com.mgp.sdk.MGP
import com.mgp.sdk.ads.AdFormat
import com.mgp.sdk.ads.model.AdError
import com.mgp.sdk.ads.model.AdErrorCode
import com.mgp.sdk.ads.model.AdInteractionListener
import com.mgp.sdk.ads.model.AdLoadListener
import com.mgp.sdk.ads.model.AdRequest
import com.mgp.sdk.ads.model.AdResponse
import com.mgp.sdk.ads.model.InteractionMetrics
import com.mgp.sdk.ads.model.VisibilityMetrics
import com.mgp.sdk.ads.network.AdHttpClient
import com.mgp.sdk.core.DeviceContextExtractor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.atomic.AtomicBoolean

/**
 * View personalizada do MGP Android SDK para exibição e gerenciamento de Banners publicitários.
 *
 * Características:
 * - Aferição rigorosa de Viewability (mínimo 50% dos pixels visíveis por 1 segundo contínuo - IAB/MRC standard).
 * - Disparo automático e único de confirmação de impressão via token criptográfico HMAC-SHA256.
 * - Despacho de métricas de clique e abertura segura de navegador externo/deep link.
 * - Suporte a dimensões padrão (320x50, 300x250, 728x90).
 */
class MgpBannerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    private val mainHandler = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(Dispatchers.Main + Job())

    private var currentPlacementId: String? = null
    private var currentAdResponse: AdResponse? = null
    private var adLoadListener: AdLoadListener? = null
    private var adInteractionListener: AdInteractionListener? = null

    private val impressionRecorded = AtomicBoolean(false)
    private var viewabilityCheckJob: Job? = null
    private var continuousVisibleMs: Long = 0L

    private var bannerImageView: ImageView? = null
    private var loadingSpinner: ProgressBar? = null

    init {
        layoutParams = LayoutParams(
            LayoutParams.WRAP_CONTENT,
            LayoutParams.WRAP_CONTENT,
            Gravity.CENTER
        )
    }

    /**
     * Define o listener de interação para cliques e impressões.
     */
    fun setAdInteractionListener(listener: AdInteractionListener?) {
        this.adInteractionListener = listener
    }

    /**
     * Carrega um anúncio Banner para o placementId especificado.
     */
    fun loadAd(placementId: String, listener: AdLoadListener? = null) {
        this.currentPlacementId = placementId
        this.adLoadListener = listener
        this.impressionRecorded.set(false)
        this.continuousVisibleMs = 0L

        val config = MGP.getConfig()
        if (config == null || !MGP.isReady()) {
            val error = AdError(
                code = AdErrorCode.INVALID_REQUEST,
                message = "MGP SDK não foi inicializado. Chame MGP.initialize() antes de carregar banners."
            )
            listener?.onAdFailedToLoad(error)
            return
        }

        showLoading()

        scope.launch {
            try {
                val adClient = AdHttpClient(config)
                val deviceContext = withContext(Dispatchers.IO) {
                    DeviceContextExtractor(context).extractDeviceContext()
                }

                val request = AdRequest(
                    placementId = placementId,
                    format = AdFormat.BANNER,
                    adUnitWidth = 320,
                    adUnitHeight = 50
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
                            hideLoading()
                            val error = AdError(
                                code = AdErrorCode.NO_FILL,
                                message = response.reason ?: "No fill retornado pelo Ad Server"
                            )
                            listener?.onAdFailedToLoad(error)
                            return@fold
                        }

                        currentAdResponse = response
                        renderBannerContent(response, adClient)
                        listener?.onAdLoaded(response.adId ?: "mgp-banner")
                    },
                    onFailure = { throwable ->
                        hideLoading()
                        val error = AdError(
                            code = AdErrorCode.NETWORK_ERROR,
                            message = throwable.message ?: "Falha na requisição ao Ad Server",
                            cause = throwable
                        )
                        listener?.onAdFailedToLoad(error)
                    }
                )
            } catch (ex: Exception) {
                hideLoading()
                val error = AdError(
                    code = AdErrorCode.INTERNAL_ERROR,
                    message = "Erro inesperado ao processar Banner: ${ex.message}",
                    cause = ex
                )
                listener?.onAdFailedToLoad(error)
            }
        }
    }

    private fun showLoading() {
        removeAllViews()
        val spinner = ProgressBar(context).apply {
            isIndeterminate = true
        }
        loadingSpinner = spinner
        addView(
            spinner,
            LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER)
        )
    }

    private fun hideLoading() {
        loadingSpinner?.let { removeView(it) }
        loadingSpinner = null
    }

    private fun renderBannerContent(response: AdResponse, client: AdHttpClient) {
        hideLoading()
        removeAllViews()

        val creative = response.creative ?: return
        val density = context.resources.displayMetrics.density
        val targetWidthPx = (creative.width * density).toInt()
        val targetHeightPx = (creative.height * density).toInt()

        val imageView = ImageView(context).apply {
            scaleType = ImageView.ScaleType.FIT_CENTER
            contentDescription = creative.title
            layoutParams = LayoutParams(targetWidthPx, targetHeightPx, Gravity.CENTER)
        }
        bannerImageView = imageView
        addView(imageView)

        // Download da imagem em segundo plano
        scope.launch {
            val bitmap = withContext(Dispatchers.IO) {
                downloadBitmap(creative.imageUrl)
            }

            if (bitmap != null) {
                imageView.setImageBitmap(bitmap)
            }

            // Configura clique
            imageView.setOnClickListener {
                handleBannerClick(response, client)
            }

            // Inicia aferição contínua de Viewability
            startViewabilityTracker(response, client)
        }
    }

    private fun handleBannerClick(response: AdResponse, client: AdHttpClient) {
        val tokens = response.tokens ?: return
        val creative = response.creative ?: return

        // Registra clique no Ad Server de forma assíncrona
        scope.launch(Dispatchers.IO) {
            client.recordClick(
                clickToken = tokens.clickToken,
                metrics = InteractionMetrics(durationBeforeClickMs = continuousVisibleMs)
            )
        }

        adInteractionListener?.onAdClicked()

        // Abre ação no navegador ou deep link
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(creative.actionUrl)).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            adInteractionListener?.onAdOpened()
        } catch (ex: Exception) {
            Log.e("MGP_SDK", "[MgpBannerView] Falha ao abrir actionUrl: ${creative.actionUrl}", ex)
        }
    }

    private fun startViewabilityTracker(response: AdResponse, client: AdHttpClient) {
        viewabilityCheckJob?.cancel()
        viewabilityCheckJob = scope.launch {
            while (isActive && !impressionRecorded.get()) {
                delay(200) // Verifica a cada 200ms

                if (isViewVisibleOnScreen()) {
                    continuousVisibleMs += 200
                    if (continuousVisibleMs >= 1000L && impressionRecorded.compareAndSet(false, true)) {
                        // Cumpre a regra MRC: >= 50% visível por >= 1s contínuo
                        dispatchImpression(response, client, continuousVisibleMs)
                        break
                    }
                } else {
                    continuousVisibleMs = 0L // Reinicia caso o usuário role e oculte a view
                }
            }
        }
    }

    private fun isViewVisibleOnScreen(): Boolean {
        if (!isShown) return false
        val rect = Rect()
        val isVisible = getGlobalVisibleRect(rect)
        if (!isVisible) return false

        val viewArea = width * height
        if (viewArea <= 0) return false

        val visibleArea = rect.width() * rect.height()
        val percent = (visibleArea.toDouble() / viewArea.toDouble()) * 100.0
        return percent >= 50.0
    }

    private fun dispatchImpression(response: AdResponse, client: AdHttpClient, durationMs: Long) {
        val tokens = response.tokens ?: return
        scope.launch(Dispatchers.IO) {
            client.recordImpression(
                impressionToken = tokens.impressionToken,
                metrics = VisibilityMetrics(
                    viewablePercentage = 100.0,
                    durationMs = durationMs
                )
            )
        }
        mainHandler.post {
            adInteractionListener?.onAdImpression()
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

    /**
     * Libera recursos e cancela observers ao destruir a view hospedeira.
     */
    fun destroy() {
        viewabilityCheckJob?.cancel()
        viewabilityCheckJob = null
        removeAllViews()
        bannerImageView = null
        currentAdResponse = null
        adLoadListener = null
        adInteractionListener = null
    }
}
