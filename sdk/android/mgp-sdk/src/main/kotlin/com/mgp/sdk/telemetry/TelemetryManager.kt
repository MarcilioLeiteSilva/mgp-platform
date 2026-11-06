package com.mgp.sdk.telemetry

import android.content.Context
import android.util.Log
import com.mgp.sdk.MgpConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicLong
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Gerenciador central de captura, assinatura criptográfica e buffer de eventos de telemetria.
 */
class TelemetryManager(
    private val context: Context,
    private val config: MgpConfig
) {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val memoryBuffer = ConcurrentLinkedQueue<TelemetryEvent>()
    private val sequenceCounter = AtomicLong(1L)

    private val isoDateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    /**
     * Enfileira um evento no buffer para processamento assíncrono.
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

        memoryBuffer.offer(event)

        if (config.debugMode) {
            Log.d("MGP_SDK", "[Telemetry] Evento enfileirado: ${event.eventType.rawValue} (seq: $seq)")
        }

        // Se buffer atingir 10 eventos, tentar flush assíncrono imediato
        if (memoryBuffer.size >= 10) {
            flushAsync()
        }
    }

    /**
     * Dispara rotina de sincronização em background.
     */
    fun flushAsync() {
        scope.launch {
            if (memoryBuffer.isEmpty()) return@launch

            val batchToTransmit = mutableListOf<TelemetryEvent>()
            while (batchToTransmit.size < 50 && memoryBuffer.isNotEmpty()) {
                val ev = memoryBuffer.poll() ?: break
                batchToTransmit.add(ev)
            }

            if (batchToTransmit.isNotEmpty() && config.debugMode) {
                Log.d("MGP_SDK", "[Telemetry] Transmitindo lote de ${batchToTransmit.size} eventos para ${config.apiUrl}")
            }
        }
    }

    /**
     * Gera assinatura HMAC-SHA256 para prevenção de tampering e replay.
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

