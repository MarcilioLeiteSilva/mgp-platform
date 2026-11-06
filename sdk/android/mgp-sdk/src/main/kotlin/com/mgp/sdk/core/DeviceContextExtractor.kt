package com.mgp.sdk.core

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.telephony.TelephonyManager
import com.mgp.sdk.antifraud.DeviceIntegrity
import java.util.Locale
import java.util.TimeZone

/**
 * Modelos de dados de contexto extraídos do dispositivo e da rede.
 */
data class DeviceContext(
    val platform: String = "ANDROID",
    val osVersion: String,
    val apiLevel: Int,
    val deviceModel: String,
    val manufacturer: String,
    val brand: String,
    val screenWidth: Int,
    val screenHeight: Int,
    val screenDensity: Float,
    val locale: String,
    val timezone: String,
    val advertisingId: String? = null,
    val isLimitAdTracking: Boolean = false,
    val isEmulator: Boolean = false,
    val isRooted: Boolean = false
)

data class AppContext(
    val packageName: String,
    val appVersion: String,
    val versionCode: Long,
    val sdkVersion: String = "0.1.0",
    val installSource: String? = null
)

data class NetworkContext(
    val networkType: String,
    val carrier: String? = null,
    val isVpnActive: Boolean = false
)

/**
 * Extrator passivo de parâmetros de hardware, aplicativo e rede.
 * Estritamente aderente à Google Play Developer Policy (zero coleta de IMEI, MAC e ANDROID_ID).
 */
object DeviceContextExtractor {

    /**
     * Extrai informações de hardware e sistema do dispositivo.
     */
    fun extractDeviceContext(
        context: Context,
        advertisingId: String? = null,
        isLimitAdTracking: Boolean = false
    ): DeviceContext {
        val displayMetrics = context.resources.displayMetrics
        val locale = Locale.getDefault()

        val safeAdId = if (isLimitAdTracking) {
            "00000000-0000-0000-0000-000000000000"
        } else {
            advertisingId
        }

        return DeviceContext(
            platform = "ANDROID",
            osVersion = Build.VERSION.RELEASE ?: "unknown",
            apiLevel = Build.VERSION.SDK_INT,
            deviceModel = Build.MODEL ?: "unknown",
            manufacturer = Build.MANUFACTURER ?: "unknown",
            brand = Build.BRAND ?: "unknown",
            screenWidth = displayMetrics.widthPixels,
            screenHeight = displayMetrics.heightPixels,
            screenDensity = displayMetrics.density,
            locale = "${locale.language}-${locale.country}",
            timezone = TimeZone.getDefault().id ?: "UTC",
            advertisingId = safeAdId,
            isLimitAdTracking = isLimitAdTracking,
            isEmulator = DeviceIntegrity.isEmulator(),
            isRooted = DeviceIntegrity.isRooted()
        )
    }

    /**
     * Extrai metadados do aplicativo hospedeiro e versão da biblioteca MGP.
     */
    fun extractAppContext(context: Context, sdkVersion: String = "0.1.0"): AppContext {
        val packageName = context.packageName
        var appVersion = "1.0.0"
        var versionCode = 1L
        var installerPackage: String? = null

        try {
            val packageManager = context.packageManager
            val pInfo = packageManager.getPackageInfo(packageName, 0)
            appVersion = pInfo.versionName ?: "1.0.0"
            versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }

            installerPackage = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                packageManager.getInstallSourceInfo(packageName).installingPackageName
            } else {
                @Suppress("DEPRECATION")
                packageManager.getInstallerPackageName(packageName)
            }
        } catch (_: Throwable) {
            // Em caso de exceção de PackageManager, mantém fallbacks seguros
        }

        return AppContext(
            packageName = packageName,
            appVersion = appVersion,
            versionCode = versionCode,
            sdkVersion = sdkVersion,
            installSource = installerPackage
        )
    }

    /**
     * Extrai dados de conectividade e rede sem requisitar permissões invasivas.
     */
    fun extractNetworkContext(context: Context): NetworkContext {
        var networkType = "NONE"
        var isVpn = false
        var carrier: String? = null

        try {
            val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            if (connectivityManager != null) {
                val activeNetwork = connectivityManager.activeNetwork
                val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork)

                if (capabilities != null) {
                    isVpn = capabilities.hasTransport(NetworkCapabilities.TRANSPORT_VPN)

                    networkType = when {
                        capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "WIFI"
                        capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "CELLULAR_4G"
                        capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "OTHER"
                        else -> "OTHER"
                    }
                }
            }

            val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
            carrier = telephonyManager?.networkOperatorName?.takeIf { it.isNotBlank() }
        } catch (_: Throwable) {
            // Degradação suave em caso de exceção de permissão de sistema
        }

        return NetworkContext(
            networkType = networkType,
            carrier = carrier,
            isVpnActive = isVpn
        )
    }
}

