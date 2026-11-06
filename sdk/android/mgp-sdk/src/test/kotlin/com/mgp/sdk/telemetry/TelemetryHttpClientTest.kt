package com.mgp.sdk.telemetry

import com.mgp.sdk.MgpConfig
import com.mgp.sdk.core.AppContext
import com.mgp.sdk.core.DeviceContext
import com.mgp.sdk.core.NetworkContext
import com.mgp.sdk.telemetry.network.TelemetryHttpClient
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TelemetryHttpClientTest {

    @Test
    fun `deve serializar payload de lote JSON estritamente aderente ao contrato`() {
        val config = MgpConfig.Builder("mgp_test_sdk_key_12345").build()
        val client = TelemetryHttpClient(config)

        val device = DeviceContext(
            platform = "ANDROID",
            osVersion = "14",
            apiLevel = 34,
            deviceModel = "Pixel 8",
            manufacturer = "Google",
            brand = "google",
            screenWidth = 1080,
            screenHeight = 2400,
            screenDensity = 2.625f,
            locale = "pt-BR",
            timezone = "America/Sao_Paulo",
            advertisingId = "4a5b6c7d-8e9f-0123-4567-89abcdef0123",
            isLimitAdTracking = false,
            isEmulator = false,
            isRooted = false
        )

        val app = AppContext(
            packageName = "com.acme.game",
            appVersion = "1.2.0",
            versionCode = 120L,
            sdkVersion = "0.1.0",
            installSource = "com.android.vending"
        )

        val network = NetworkContext(
            networkType = "WIFI",
            carrier = "Claro",
            isVpnActive = false
        )

        val events = listOf(
            TelemetryEvent(
                eventId = "11111111-2222-3333-4444-555555555555",
                eventType = TelemetryEventType.SESSION_START,
                sessionId = "sess_abc",
                timestamp = "2026-11-06T14:30:00.000Z",
                sequenceNumber = 1L,
                properties = mapOf("screen" to "main_menu"),
                nonce = "nonce_1234567890ab",
                signature = "sig_hmac_sha256_mock"
            )
        )

        val jsonString = client.buildBatchPayloadJson(events, device, app, network)
        val json = JSONObject(jsonString)

        assertNotNull(json.optString("batchId"))
        assertNotNull(json.optString("sentAt"))
        assertEquals("mgp_test_sdk_key_12345", json.getString("sdkKey"))

        // Valida Device
        val devJson = json.getJSONObject("device")
        assertEquals("ANDROID", devJson.getString("platform"))
        assertEquals("Pixel 8", devJson.getString("deviceModel"))
        assertEquals("4a5b6c7d-8e9f-0123-4567-89abcdef0123", devJson.getString("advertisingId"))

        // Valida App
        val appJson = json.getJSONObject("app")
        assertEquals("com.acme.game", appJson.getString("packageName"))
        assertEquals(120L, appJson.getLong("versionCode"))

        // Valida Network
        val netJson = json.getJSONObject("network")
        assertEquals("WIFI", netJson.getString("networkType"))

        // Valida Events
        val evsArray = json.getJSONArray("events")
        assertEquals(1, evsArray.length())
        val firstEv = evsArray.getJSONObject(0)
        assertEquals("SESSION_START", firstEv.getString("eventType"))
        assertEquals("sess_abc", firstEv.getString("sessionId"))
        assertEquals("sig_hmac_sha256_mock", firstEv.getString("signature"))
    }
}

