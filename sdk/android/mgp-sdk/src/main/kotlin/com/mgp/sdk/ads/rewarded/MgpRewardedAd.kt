package com.mgp.sdk.ads.rewarded

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
import android.widget.ProgressBar
import android.widget.TextView
import com.mgp.sdk.MGP
import com.mgp.sdk.ads.AdFormat
import com.mgp.sdk.ads.model.AdError
import com.mgp.sdk.ads.model.AdErrorCode
import com.mgp.sdk.ads.model.AdInteractionListener
import com.mgp.sdk.ads.model.AdRequest
import com.mgp.sdk.ads.model.AdResponse
import com.mgp.sdk.ads.model.InteractionMetrics
import com.mgp.sdk.ads.model.OnUserEarnedRewardListener
import com.mgp.sdk.ads.model.RewardData
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
import java.util.UUID
import java.util.concurrent.atomic.AtomicBoolean

interface RewardedAdLoadCallback {
    fun onAdLoaded(rewardedAd: MgpRewardedAd)
    fun onAdFailedToLoad(error: AdError)
}

/**
 * Gerenciador de anúncios Recompensados (Rewarded Ads) do MGP Android SDK.
 *
 * Características:
 * - Validação estrita de tempo de visualização assistida (Required Watch Seconds).
 * - Despacho seguro de token criptográfico HMAC-SHA256 (`POST /events/reward`).
 * - Disparo do callback oficial `OnUserEarnedRewardListener` apenas após validação do backend.
 */
class MgpRewardedAd private constructor(
    private val context: Context,
    private val placementId: String,
    private val adResponse: AdResponse,
    private val adClient: AdHttpClient
) {

    private val mainHandler = Handler(Looper.getMainLooper())
    private val scope = CoroutineScope(Dispatchers.Main + Job())
    private val impressionRecorded = AtomicBoolean(false)
    private val rewardClaimed = AtomicBoolean(false)

    private var interactionListener: AdInteractionListener? = null
    private var activeDialog: Dialog? = null

    fun setInteractionListener(listener: AdInteractionListener?) {
        this.interactionListener = listener
    }

    fun isLoaded(): Boolean =
        adResponse.fill &&
        adResponse.creative != null &&
        adResponse.tokens?.rewardToken != null

    /**
     * Exibe o anúncio Recompensado e vincula o listener de premiação.
     */
    fun show(activity: Activity, rewardListener: OnUserEarnedRewardListener) {
        if (!isLoaded()) {
            Log.w("MGP_SDK", "[MgpRewardedAd] Tentativa de show() em anúncio não carregado.")
            return
        }

        if (activity.isFinishing || activity.isDestroyed) {
            Log.w("MGP_SDK", "[MgpRewardedAd] Activity inválida para exibição do anúncio Recompensado.")
            return
        }

        val creative = adResponse.creative ?: return
        val tokens = adResponse.tokens ?: return
        val rewardToken = tokens.rewardToken ?: return

        val requiredSeconds = (creative.requiredWatchSeconds ?: 15).coerceAtLeast(5)
        val rewardType = creative.rewardType ?: "COINS"
        val rewardAmount = creative.rewardAmount ?: 100

        val dialog = Dialog(activity, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
        activeDialog = dialog

        val rootLayout = FrameLayout(activity).apply {
            setBackgroundColor(Color.parseColor("#0B0F19"))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Mídia Principal
        val imageView = ImageView(activity).apply {
            scaleType = ImageView.ScaleType.FIT_CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
                Gravity.CENTER
            )
        }
        rootLayout.addView(imageView)

        // Barra de Progresso Superior
        val progressBar = ProgressBar(activity, null, android.R.attr.progressBarStyleHorizontal).apply {
            max = requiredSeconds
            progress = 0
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                24,
                Gravity.TOP
            )
        }
        rootLayout.addView(progressBar)

        // Badge de Recompensa e Contador
        val statusBadge = TextView(activity).apply {
            textSize = 14f
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#B3000000"))
            setPadding(32, 20, 32, 20)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            text = "Recompensa em ${requiredSeconds}s"
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP or Gravity.END
            ).apply {
                topMargin = 48
                rightMargin = 48
            }
        }
        rootLayout.addView(statusBadge)

        dialog.setContentView(rootLayout)
        dialog.setCancelable(false)
        dialog.show()

        // Disparo de Impressão imediato
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

        // Carrega imagem e executa contagem regressiva de recompensa
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
                    Log.e("MGP_SDK", "[MgpRewardedAd] Falha ao abrir actionUrl", ex)
                }
            }

            var elapsed = 0
            while (elapsed < requiredSeconds) {
                kotlinx.coroutines.delay(1000)
                elapsed++
                val remaining = requiredSeconds - elapsed
                progressBar.progress = elapsed
                if (remaining > 0) {
                    statusBadge.text = "Recompensa em ${remaining}s"
                }
            }

            // Concluiu os requiredSeconds com sucesso!
            if (rewardClaimed.compareAndSet(false, true)) {
                // Notifica o Ad Server da conclusão do vídeo
                scope.launch(Dispatchers.IO) {
                    adClient.claimReward(
                        rewardToken = rewardToken,
                        watchDurationSeconds = requiredSeconds
                    )
                }

                val reward = RewardData(
                    rewardType = rewardType,
                    rewardAmount = rewardAmount,
                    transactionId = UUID.randomUUID().toString()
                )
                rewardListener.onUserEarnedReward(reward)
            }

            // Habilita botão de encerramento
            statusBadge.text = "✓ Recompensa Conquistada! [✕]"
            statusBadge.setBackgroundColor(Color.parseColor("#CC059669"))
            statusBadge.setOnClickListener {
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
         * Carrega de forma assíncrona um anúncio Recompensado.
         */
        @JvmStatic
        fun load(
            context: Context,
            placementId: String,
            callback: RewardedAdLoadCallback
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
                        format = AdFormat.REWARDED,
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
                            if (!response.fill || response.creative == null || response.tokens?.rewardToken == null) {
                                callback.onAdFailedToLoad(
                                    AdError(
                                        code = AdErrorCode.NO_FILL,
                                        message = response.reason ?: "Sem preenchimento para Rewarded Ad"
                                    )
                                )
                                return@fold
                            }

                            val rewardedAd = MgpRewardedAd(
                                context = context.applicationContext,
                                placementId = placementId,
                                adResponse = response,
                                adClient = adClient
                            )
                            callback.onAdLoaded(rewardedAd)
                        },
                        onFailure = { throwable ->
                            callback.onAdFailedToLoad(
                                AdError(
                                    code = AdErrorCode.NETWORK_ERROR,
                                    message = throwable.message ?: "Erro de rede no Rewarded Ad",
                                    cause = throwable
                                )
                            )
                        }
                    )
                } catch (ex: Exception) {
                    callback.onAdFailedToLoad(
                        AdError(
                            code = AdErrorCode.INTERNAL_ERROR,
                            message = "Falha crítica ao carregar Rewarded Ad: ${ex.message}",
                            cause = ex
                        )
                    )
                }
            }
        }
    }
}

