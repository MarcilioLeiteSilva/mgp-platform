package com.mgp.sdk.telemetry.network

import android.util.Log
import com.mgp.sdk.MgpConfig
import com.mgp.sdk.core.AppContext
import com.mgp.sdk.core.DeviceContext
import com.mgp.sdk.core.NetworkContext
import com.mgp.sdk.telemetry.TelemetryEvent
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

sealed class TelemetryTransmissionResult {
    data class Success(val processedCount: Int, val serverTime: String) : TelemetryTransmissionResult()
    data class ClientError(val statusCode: Int, val message: String) : TelemetryTransmissionResult()
    data class TransientError(val message: String, val throwable: Throwable? = null) : TelemetryTransmissionResult()
}

/**
 * Cliente HTTP seguro e ultraleve (baseado em HttpURLConnection nativo).
 * Realiza transmissões de lotes em formato JSON sem adicionar bibliotecas externas.
 */
class TelemetryHttpClient(private val config: MgpConfig) {

    private val isoDateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    /**
     * Transmite um lote de eventos para o backend de telemetria.
     */
    fun transmitBatch(
        events: List<TelemetryEvent>,
        deviceContext: DeviceContext,
        appContext: AppContext,
        networkContext: NetworkContext
    ): TelemetryTransmissionResult {
        if (events.isEmpty()) {
            return TelemetryTransmissionResult.Success(0, isoDateFormat.format(Date()))
        }

        val endpointUrl = "${config.apiUrl}/telemetry/batch"
        val payloadJson = buildBatchPayloadJson(events, deviceContext, appContext, networkContext)

        var connection: HttpURLConnection? = null
        return try {
            val url = URL(endpointUrl)
            connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                connectTimeout = 10_000 // 10 segundos
                readTimeout = 15_000    // 15 segundos
                doInput = true
                doOutput = true
                useCaches = false
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
                setRequestProperty("Accept", "application/json")
                setRequestProperty("X-SDK-Version", appContext.sdkVersion)
                setRequestProperty("X-SDK-Key", config.sdkKey)
            }

            OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer ->
                writer.write(payloadJson)
                writer.flush()
            }

            val statusCode = connection.responseCode
            val responseBody = readStream(if (statusCode in 200..299) connection.inputStream else connection.errorStream)

            if (config.debugMode) {
                Log.d("MGP_SDK", "[TelemetryHttpClient] Resposta $statusCode: $responseBody")
            }

            when (statusCode) {
                HttpURLConnection.HTTP_OK, HttpURLConnection.HTTP_CREATED -> {
                    val json = JSONObject(responseBody)
                    val processed = json.optInt("processedCount", events.size)
                    val time = json.optString("serverTime", isoDateFormat.format(Date()))
                    TelemetryTransmissionResult.Success(processed, time)
                }
                HttpURLConnection.HTTP_NO_CONTENT -> {
                    TelemetryTransmissionResult.Success(events.size, isoDateFormat.format(Date()))
                }
                in 400..499 -> {
                    TelemetryTransmissionResult.ClientError(statusCode, responseBody)
                }
                else -> {
                    TelemetryTransmissionResult.TransientError("HTTP $statusCode: $responseBody")
                }
            }
        } catch (e: Throwable) {
            if (config.debugMode) {
                Log.w("MGP_SDK", "[TelemetryHttpClient] Falha transitória de conexão: ${e.message}")
            }
            TelemetryTransmissionResult.TransientError(e.message ?: "Falha de rede", e)
        } finally {
            connection?.disconnect()
        }
    }

    /**
     * Serializa o envelope TelemetryBatchRequest em JSON padrão.
     */
    fun buildBatchPayloadJson(
        events: List<TelemetryEvent>,
        device: DeviceContext,
        app: AppContext,
        network: NetworkContext
    ): String {
        val root = JSONObject()
        root.put("batchId", UUID.randomUUID().toString())
        root.put("sentAt", isoDateFormat.format(Date()))
        root.put("sdkKey", config.sdkKey)

        // Device Context
        val deviceJson = JSONObject().apply {
            put("platform", device.platform)
            put("osVersion", device.osVersion)
            put("apiLevel", device.apiLevel)
            put("deviceModel", device.deviceModel)
            put("manufacturer", device.manufacturer)
            put("brand", device.brand)
            put("screenWidth", device.screenWidth)
            put("screenHeight", device.screenHeight)
            put("screenDensity", device.screenDensity)
            put("locale", device.locale)
            put("timezone", device.timezone)
            device.advertisingId?.let { put("advertisingId", it) }
            put("isLimitAdTracking", device.isLimitAdTracking)
            put("isEmulator", device.isEmulator)
            put("isRooted", device.isRooted)
        }
        root.put("device", deviceJson)

        // App Context
        val appJson = JSONObject().apply {
            put("packageName", app.packageName)
            put("appVersion", app.appVersion)
            put("versionCode", app.versionCode)
            put("sdkVersion", app.sdkVersion)
            app.installSource?.let { put("installSource", it) }
        }
        root.put("app", appJson)

        // Network Context
        val networkJson = JSONObject().apply {
            put("networkType", network.networkType)
            network.carrier?.let { put("carrier", it) }
            put("isVpnActive", network.isVpnActive)
        }
        root.put("network", networkJson)

        // Events Array
        val eventsArray = JSONArray()
        for (ev in events) {
            val eventObj = JSONObject().apply {
                put("eventId", ev.eventId)
                put("eventType", ev.eventType.rawValue)
                put("sessionId", ev.sessionId)
                put("timestamp", ev.timestamp)
                put("sequenceNumber", ev.sequenceNumber)
                put("properties", JSONObject(ev.properties))
                put("nonce", ev.nonce)
                put("signature", ev.signature)
            }
            eventsArray.put(eventObj)
        }
        root.put("events", eventsArray)

        return root.toString()
    }

    private fun readStream(stream: java.io.InputStream?): String {
        if (stream == null) return ""
        return BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
    }
}

