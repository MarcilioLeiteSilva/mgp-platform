package com.mgp.sdk.ads.network

import android.util.Log
import com.mgp.sdk.MgpConfig
import com.mgp.sdk.ads.AdFormat
import com.mgp.sdk.ads.model.AdErrorCode
import com.mgp.sdk.ads.model.AdRequest
import com.mgp.sdk.ads.model.AdResponse
import com.mgp.sdk.ads.model.AdTokens
import com.mgp.sdk.ads.model.CreativeData
import com.mgp.sdk.ads.model.InteractionMetrics
import com.mgp.sdk.ads.model.PricingData
import com.mgp.sdk.ads.model.PricingModel
import com.mgp.sdk.ads.model.VisibilityMetrics
import com.mgp.sdk.core.DeviceContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

/**
 * Cliente HTTP nativo para comunicação de ultra-baixa latência com o Ad Server MGP Fastify.
 * Suporta requisições de leilão RTB, confirmação de impressão, rastreamento de cliques e resgate de recompensas.
 */
class AdHttpClient(private val config: MgpConfig) {

    private val isoDateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    /**
     * Solicita um anúncio ao Ad Server (`POST /ads/request`).
     */
    fun requestAd(
        request: AdRequest,
        deviceContext: DeviceContext?,
        sessionId: String?
    ): Result<AdResponse> {
        val endpointUrl = "${config.adServerUrl}/ads/request"
        var connection: HttpURLConnection? = null

        return try {
            val payloadJson = JSONObject().apply {
                put("adUnitId", request.placementId)
                put("format", request.format.code)
                put("placement", request.placementId)
                put("sdkVersion", "1.0.0")

                val devJson = JSONObject().apply {
                    put("platform", "ANDROID")
                    put("osVersion", deviceContext?.osVersion ?: android.os.Build.VERSION.RELEASE)
                    put("deviceModel", deviceContext?.deviceModel ?: android.os.Build.MODEL)
                    put("language", deviceContext?.locale ?: "pt-BR")
                    put("country", deviceContext?.locale?.takeLast(2)?.uppercase() ?: "BR")
                    if (deviceContext?.advertisingId != null) {
                        put("advertisingId", deviceContext.advertisingId)
                    }
                    put("isLimitAdTracking", deviceContext?.isLimitAdTracking ?: false)
                }
                put("device", devJson)
            }

            val url = URL(endpointUrl)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 3_000 // 3 segundos (Ultra-Low Latency)
                readTimeout = 4_000
                doInput = true
                doOutput = true
                useCaches = false
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-MGP-SDK-Key", config.sdkKey)
                setRequestProperty("X-SDK-Key", config.sdkKey)
                setRequestProperty("X-Requested-With", "MGP-Android-SDK")
            }

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payloadJson.toString())
                writer.flush()
            }

            val statusCode = connection.responseCode
            val responseBody = if (statusCode in 200..299) {
                BufferedReader(InputStreamReader(connection.inputStream, Charsets.UTF_8)).use { it.readText() }
            } else {
                val errorStream = connection.errorStream
                if (errorStream != null) {
                    BufferedReader(InputStreamReader(errorStream, Charsets.UTF_8)).use { it.readText() }
                } else {
                    "HTTP $statusCode"
                }
            }

            if (statusCode in 200..299) {
                val json = JSONObject(responseBody)
                val fill = json.optBoolean("fill", false)
                val requestId = json.optString("requestId", UUID.randomUUID().toString())

                if (!fill) {
                    val reason = json.optString("reason", "No fill available")
                    return Result.success(
                        AdResponse(
                            requestId = requestId,
                            fill = false,
                            reason = reason
                        )
                    )
                }

                val adId = json.getString("adId")
                val formatStr = json.getString("format")
                val format = AdFormat.fromCode(formatStr)

                val creativeJson = json.getJSONObject("creative")
                val creative = CreativeData(
                    id = creativeJson.getString("id"),
                    format = AdFormat.fromCode(creativeJson.optString("format", formatStr)),
                    title = creativeJson.getString("title"),
                    description = creativeJson.optString("description", null),
                    imageUrl = creativeJson.getString("imageUrl"),
                    actionUrl = creativeJson.getString("actionUrl"),
                    width = creativeJson.optInt("width", request.adUnitWidth),
                    height = creativeJson.optInt("height", request.adUnitHeight),
                    iconUrl = creativeJson.optString("iconUrl", null),
                    ctaText = creativeJson.optString("ctaText", "Instalar"),
                    starRating = if (creativeJson.has("starRating") && !creativeJson.isNull("starRating")) creativeJson.getDouble("starRating") else null,
                    sponsorText = creativeJson.optString("sponsorText", null),
                    skipOffsetSeconds = creativeJson.optInt("skipOffsetSeconds", 5),
                    rewardType = creativeJson.optString("rewardType", null),
                    rewardAmount = if (creativeJson.has("rewardAmount") && !creativeJson.isNull("rewardAmount")) creativeJson.getInt("rewardAmount") else null,
                    requiredWatchSeconds = creativeJson.optInt("requiredWatchSeconds", 15),
                    htmlContent = creativeJson.optString("htmlContent", null)
                )

                val pricingJson = json.getJSONObject("pricing")
                val pricing = PricingData(
                    model = PricingModel.fromCode(pricingJson.getString("model")),
                    bidAmount = pricingJson.getDouble("bidAmount"),
                    clearingPrice = if (pricingJson.has("clearingPrice") && !pricingJson.isNull("clearingPrice")) pricingJson.getDouble("clearingPrice") else null,
                    currency = pricingJson.optString("currency", "BRL")
                )

                val tokensJson = json.getJSONObject("tokens")
                val tokens = AdTokens(
                    impressionToken = tokensJson.getString("impressionToken"),
                    clickToken = tokensJson.getString("clickToken"),
                    rewardToken = tokensJson.optString("rewardToken", null),
                    expiresAt = tokensJson.getString("expiresAt")
                )

                Result.success(
                    AdResponse(
                        requestId = requestId,
                        fill = true,
                        adId = adId,
                        format = format,
                        creative = creative,
                        pricing = pricing,
                        tokens = tokens
                    )
                )
            } else {
                Result.failure(RuntimeException("Ad Server retornou erro HTTP $statusCode: $responseBody"))
            }
        } catch (ex: Exception) {
            if (config.debugMode) {
                Log.e("MGP_SDK", "[AdHttpClient] Falha ao solicitar anúncio: ${ex.message}", ex)
            }
            Result.failure(ex)
        } finally {
            connection?.disconnect()
        }
    }

    /**
     * Notifica o Ad Server sobre a exibição/impressão confirmada do anúncio (`POST /events/impression`).
     */
    fun recordImpression(
        impressionToken: String,
        metrics: VisibilityMetrics
    ): Result<Boolean> {
        val endpointUrl = "${config.adServerUrl}/events/impression"
        var connection: HttpURLConnection? = null

        return try {
            val payload = JSONObject().apply {
                put("impressionToken", impressionToken)
                put("nonce", UUID.randomUUID().toString())
                put("renderedAt", isoDateFormat.format(Date()))
                put("visibilityMetrics", JSONObject().apply {
                    put("viewablePercentage", metrics.viewablePercentage)
                    put("durationMs", metrics.durationMs)
                })
            }

            val url = URL(endpointUrl)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 3_000
                readTimeout = 4_000
                doInput = true
                doOutput = true
                useCaches = false
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-SDK-Key", config.sdkKey)
            }

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val code = connection.responseCode
            if (code in 200..299) {
                Result.success(true)
            } else {
                Result.failure(RuntimeException("Falha ao registrar impressão: HTTP $code"))
            }
        } catch (ex: Exception) {
            Result.failure(ex)
        } finally {
            connection?.disconnect()
        }
    }

    /**
     * Notifica o Ad Server sobre o clique no anúncio (`POST /events/click`).
     */
    fun recordClick(
        clickToken: String,
        metrics: InteractionMetrics?
    ): Result<Boolean> {
        val endpointUrl = "${config.adServerUrl}/events/click"
        var connection: HttpURLConnection? = null

        return try {
            val payload = JSONObject().apply {
                put("clickToken", clickToken)
                put("nonce", UUID.randomUUID().toString())
                put("clickedAt", isoDateFormat.format(Date()))
                if (metrics != null) {
                    put("interactionMetrics", JSONObject().apply {
                        metrics.touchX?.let { put("touchX", it.toDouble()) }
                        metrics.touchY?.let { put("touchY", it.toDouble()) }
                        metrics.durationBeforeClickMs?.let { put("durationBeforeClickMs", it) }
                    })
                }
            }

            val url = URL(endpointUrl)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 3_000
                readTimeout = 4_000
                doInput = true
                doOutput = true
                useCaches = false
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-SDK-Key", config.sdkKey)
            }

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val code = connection.responseCode
            if (code in 200..299) {
                Result.success(true)
            } else {
                Result.failure(RuntimeException("Falha ao registrar clique: HTTP $code"))
            }
        } catch (ex: Exception) {
            Result.failure(ex)
        } finally {
            connection?.disconnect()
        }
    }

    /**
     * Notifica o Ad Server sobre a conclusão do vídeo de recompensa (`POST /events/reward`).
     */
    fun claimReward(
        rewardToken: String,
        watchDurationSeconds: Int
    ): Result<Boolean> {
        val endpointUrl = "${config.adServerUrl}/events/reward"
        var connection: HttpURLConnection? = null

        return try {
            val payload = JSONObject().apply {
                put("rewardToken", rewardToken)
                put("nonce", UUID.randomUUID().toString())
                put("completedAt", isoDateFormat.format(Date()))
                put("watchDurationSeconds", watchDurationSeconds)
            }

            val url = URL(endpointUrl)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 4_000
                readTimeout = 5_000
                doInput = true
                doOutput = true
                useCaches = false
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-SDK-Key", config.sdkKey)
            }

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val code = connection.responseCode
            if (code in 200..299) {
                Result.success(true)
            } else {
                Result.failure(RuntimeException("Falha ao resgatar recompensa: HTTP $code"))
            }
        } catch (ex: Exception) {
            Result.failure(ex)
        } finally {
            connection?.disconnect()
        }
    }
}
