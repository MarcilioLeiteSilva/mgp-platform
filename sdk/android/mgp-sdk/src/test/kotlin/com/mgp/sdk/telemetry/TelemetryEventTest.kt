package com.mgp.sdk.telemetry

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class TelemetryEventTest {

    @Test
    fun `deve instanciar TelemetryEvent com valores padrao de nonce e id`() {
        val event = TelemetryEvent(
            eventType = TelemetryEventType.SESSION_START,
            sessionId = "session_123",
            timestamp = "2026-11-06T14:00:00.000Z",
            sequenceNumber = 1L
        )

        assertNotNull(event.eventId)
        assertNotNull(event.nonce)
        assertEquals(TelemetryEventType.SESSION_START, event.eventType)
        assertEquals("session_123", event.sessionId)
        assertEquals(1L, event.sequenceNumber)
    }

    @Test
    fun `deve validar todos os valores do enum de eventos`() {
        assertEquals("APP_OPEN", TelemetryEventType.APP_OPEN.rawValue)
        assertEquals("SESSION_START", TelemetryEventType.SESSION_START.rawValue)
        assertEquals("HEARTBEAT", TelemetryEventType.HEARTBEAT.rawValue)
        assertEquals("SESSION_END", TelemetryEventType.SESSION_END.rawValue)
        assertEquals("CUSTOM_EVENT", TelemetryEventType.CUSTOM_EVENT.rawValue)
    }
}

