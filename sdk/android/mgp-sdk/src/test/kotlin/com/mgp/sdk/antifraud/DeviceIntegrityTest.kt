package com.mgp.sdk.antifraud

import org.junit.Assert.assertNotNull
import org.junit.Test

class DeviceIntegrityTest {

    @Test
    fun `deve executar checagens de integridade passivas com seguranca`() {
        // Assegura que as chamadas não lançam NullPointerException ou SecurityException
        val isEmulator = DeviceIntegrity.isEmulator()
        val isRooted = DeviceIntegrity.isRooted()

        assertNotNull(isEmulator)
        assertNotNull(isRooted)
    }
}

