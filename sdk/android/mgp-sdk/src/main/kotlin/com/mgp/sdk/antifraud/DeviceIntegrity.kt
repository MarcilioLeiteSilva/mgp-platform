package com.mgp.sdk.antifraud

import android.os.Build
import java.io.File
import java.util.Locale

/**
 * Inspetor passivo de integridade do dispositivo.
 * Detecta indicadores conhecidos de emuladores e privilégios de Root sem interromper o host.
 */
object DeviceIntegrity {

    /**
     * Avalia heurísticas de parâmetros de compilação do Android para detectar emuladores.
     */
    fun isEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT.lowercase(Locale.ROOT)
        val model = Build.MODEL.lowercase(Locale.ROOT)
        val manufacturer = Build.MANUFACTURER.lowercase(Locale.ROOT)
        val product = Build.PRODUCT.lowercase(Locale.ROOT)
        val hardware = Build.HARDWARE.lowercase(Locale.ROOT)

        val indicators = listOf(
            fingerprint.startsWith("generic"),
            fingerprint.startsWith("unknown"),
            model.contains("google_sdk"),
            model.contains("emulator"),
            model.contains("android sdk built for x86"),
            manufacturer.contains("genymotion"),
            hardware.contains("goldfish"),
            hardware.contains("ranchu"),
            hardware.contains("vbox86"),
            product.contains("sdk_gphone"),
            product.contains("vbox86p")
        )

        return indicators.count { it } >= 2
    }

    /**
     * Verifica a presença de binários e assinaturas comuns de Root.
     */
    fun isRooted(): Boolean {
        val buildTags = Build.TAGS
        if (buildTags != null && buildTags.contains("test-keys")) {
            return true
        }

        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su"
        )

        for (path in paths) {
            try {
                if (File(path).exists()) {
                    return true
                }
            } catch (_: Throwable) {
                // Bloqueado por SELinux / permissões seguras
            }
        }

        return false
    }
}

