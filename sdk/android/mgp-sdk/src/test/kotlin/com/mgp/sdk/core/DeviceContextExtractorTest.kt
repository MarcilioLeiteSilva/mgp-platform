package com.mgp.sdk.core

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test

class DeviceContextExtractorTest {

    @Test
    fun `deve instanciar DeviceContext com valores conformes`() {
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
            advertisingId = "00000000-0000-0000-0000-000000000000",
            isLimitAdTracking = true,
            isEmulator = false,
            isRooted = false
        )

        assertEquals("ANDROID", device.platform)
        assertEquals(34, device.apiLevel)
        assertEquals("00000000-0000-0000-0000-000000000000", device.advertisingId)
        assertEquals(true, device.isLimitAdTracking)
    }

    @Test
    fun `deve instanciar AppContext e NetworkContext corretamente`() {
        val app = AppContext(
            packageName = "com.mgp.demo",
            appVersion = "1.0.0",
            versionCode = 100L,
            sdkVersion = "0.1.0"
        )
        val net = NetworkContext(
            networkType = "WIFI",
            carrier = "Vivo",
            isVpnActive = false
        )

        assertEquals("com.mgp.demo", app.packageName)
        assertEquals(100L, app.versionCode)
        assertEquals("WIFI", net.networkType)
        assertEquals(false, net.isVpnActive)
    }
}

