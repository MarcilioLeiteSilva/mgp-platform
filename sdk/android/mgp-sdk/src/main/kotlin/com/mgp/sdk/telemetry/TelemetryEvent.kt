package com.mgp.sdk.telemetry

import java.util.UUID

/**
 * Taxonomia oficial de eventos de telemetria da MGP.
 */
enum class TelemetryEventType(val rawValue: String) {
    APP_OPEN("APP_OPEN"),
    SESSION_START("SESSION_START"),
    HEARTBEAT("HEARTBEAT"),
    SESSION_END("SESSION_END"),
    CUSTOM_EVENT("CUSTOM_EVENT")
}

/**
 * Modelo de dados de um evento de telemetria emitido pelo SDK.
 */
data class TelemetryEvent(
    val eventId: String = UUID.randomUUID().toString(),
    val eventType: TelemetryEventType,
    val sessionId: String,
    val timestamp: String,
    val sequenceNumber: Long = 0L,
    val properties: Map<String, Any?> = emptyMap(),
    val nonce: String = UUID.randomUUID().toString(),
    val signature: String = ""
)

