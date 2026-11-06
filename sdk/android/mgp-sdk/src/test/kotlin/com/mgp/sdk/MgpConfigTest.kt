package com.mgp.sdk

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MgpConfigTest {

    @Test
    fun `deve construir config valida com valores padrao`() {
        val config = MgpConfig.Builder("mgp_live_test_key_12345").build()

        assertEquals("mgp_live_test_key_12345", config.sdkKey)
        assertEquals("https://mgp-production-mgp-adserver.gtalg3.easypanel.host", config.adServerUrl)
        assertEquals("https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1", config.apiUrl)
        assertFalse(config.debugMode)
        assertTrue(config.autoCollectLifecycle)
        assertEquals(60L, config.heartbeatIntervalSeconds)
    }

    @Test
    fun `deve permitir customizar parametros do builder`() {
        val config = MgpConfig.Builder("mgp_custom_key")
            .setAdServerUrl("https://custom-adserver.host")
            .setApiUrl("https://custom-api.host/api/v1")
            .setDebugMode(true)
            .setAutoCollectLifecycle(false)
            .setHeartbeatInterval(30L)
            .build()

        assertEquals("mgp_custom_key", config.sdkKey)
        assertEquals("https://custom-adserver.host", config.adServerUrl)
        assertEquals("https://custom-api.host/api/v1", config.apiUrl)
        assertTrue(config.debugMode)
        assertFalse(config.autoCollectLifecycle)
        assertEquals(30L, config.heartbeatIntervalSeconds)
    }

    @Test(expected = IllegalArgumentException::class)
    fun `deve lancar excecao para sdkKey vazia`() {
        MgpConfig.Builder("").build()
    }

    @Test(expected = IllegalArgumentException::class)
    fun `deve lancar excecao para heartbeat inferior a 10 segundos`() {
        MgpConfig.Builder("valid_key")
            .setHeartbeatInterval(5L)
            .build()
    }
}

