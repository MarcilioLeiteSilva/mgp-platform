package com.mgp.sdk.telemetry

import android.content.Context
import android.util.Log
import com.mgp.sdk.MgpConfig
import com.mgp.sdk.core.DeviceContextExtractor
import com.mgp.sdk.telemetry.network.TelemetryHttpClient
import com.mgp.sdk.telemetry.network.TelemetryTransmissionResult
import com.mgp.sdk.telemetry.storage.TelemetryDatabaseHelper
import com.mgp.sdk.telemetry.worker.TelemetrySyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.atomic.AtomicLong
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Gerenciador central de captura, assinatura criptográfica HMAC-SHA256,
 * persistência em SQLite e sincronização com o backend da MGP.
 */
class TelemetryManager(
    private val context: Context,
    private val config: MgpConfig
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val dbHelper = TelemetryDatabaseHelper(context)
    private val httpClient = TelemetryHttpClient(config)
    private val sequenceCounter = AtomicLong(1L)

    private val isoDateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    /**
     * Enfileira um evento no buffer SQLite local com assinatura HMAC-SHA256 e Nonce.
     */
    fun enqueueEvent(
        eventType: TelemetryEventType,
        sessionId: String,
        properties: Map<String, Any?> = emptyMap()
    ) {
        val now = isoDateFormat.format(Date())
        val eventId = UUID.randomUUID().toString()
        val nonce = UUID.randomUUID().toString()
        val seq = sequenceCounter.getAndIncrement()

        val signature = computeHmacSignature(
            data = "$eventId|${eventType.rawValue}|$sessionId|$now|$nonce",
            key = config.sdkKey
        )

        val event = TelemetryEvent(
            eventId = eventId,
            eventType = eventType,
            sessionId = sessionId,
            timestamp = now,
            sequenceNumber = seq,
            properties = properties,
            nonce = nonce,
            signature = signature
        )

        scope.launch {
            try {
                dbHelper.insertEvent(event)

                if (config.debugMode) {
                    Log.d("MGP_SDK", "[Telemetry] Evento persistido localmente: ${event.eventType.rawValue} (id: $eventId, seq: $seq)")
                }

                // Se houver 10 ou mais eventos acumulados, tenta flush imediato
                if (dbHelper.getEventsCount() >= 10) {
                    flushAsync()
                }
            } catch (e: Throwable) {
                Log.e("MGP_SDK", "[Telemetry] Erro ao gravar evento no SQLite: ${e.message}")
            }
        }
    }

    /**
     * Transmite imediatamente eventos pendentes do buffer local em thread de IO.
     */
    fun flushAsync() {
        scope.launch {
            try {
                val pendingEvents = dbHelper.getPendingEvents(limit = 50)
                if (pendingEvents.isEmpty()) return@launch

                val deviceContext = DeviceContextExtractor.extractDeviceContext(context)
                val appContext = DeviceContextExtractor.extractAppContext(context)
                val networkContext = DeviceContextExtractor.extractNetworkContext(context)

                val result = httpClient.transmitBatch(
                    events = pendingEvents,
                    deviceContext = deviceContext,
                    appContext = appContext,
                    networkContext = networkContext
                )

                when (result) {
                    is TelemetryTransmissionResult.Success -> {
                        val sentIds = pendingEvents.map { it.eventId }
                        dbHelper.deleteEvents(sentIds)
                        if (config.debugMode) {
                            Log.d("MGP_SDK", "[Telemetry] Flush concluído: ${result.processedCount} eventos enviados com sucesso.")
                        }
                    }
                    is TelemetryTransmissionResult.ClientError -> {
                        val badIds = pendingEvents.map { it.eventId }
                        dbHelper.deleteEvents(badIds)
                        Log.w("MGP_SDK", "[Telemetry] Rejeição pelo servidor (${result.statusCode}): ${result.message}. Eventos removidos.")
                    }
                    is TelemetryTransmissionResult.TransientError -> {
                        if (config.debugMode) {
                            Log.w("MGP_SDK", "[Telemetry] Falha transitória no flush. Agendando WorkManager em background...")
                        }
                        TelemetrySyncWorker.schedule(context)
                    }
                }
            } catch (e: Throwable) {
                Log.w("MGP_SDK", "[Telemetry] Falha no flush assíncrono: ${e.message}")
                TelemetrySyncWorker.schedule(context)
            }
        }
    }

    /**
     * Retorna a contagem atual de eventos retidos no buffer local.
     */
    fun getPendingCount(): Long = dbHelper.getEventsCount()

    /**
     * Computa a assinatura digital HMAC-SHA256 do evento.
     */
    private fun computeHmacSignature(data: String, key: String): String {
        return try {
            val algorithm = "HmacSHA256"
            val secretKey = SecretKeySpec(key.toByteArray(Charsets.UTF_8), algorithm)
            val mac = Mac.getInstance(algorithm)
            mac.init(secretKey)
            val hash = mac.doFinal(data.toByteArray(Charsets.UTF_8))
            hash.joinToString("") { "%02x".format(it) }
        } catch (_: Throwable) {
            ""
        }
    }
}
