package com.mgp.sdk.ads

/**
 * Formatos de anúncios suportados pelo ecossistema MGP Ad Network.
 */
enum class AdFormat(val code: String) {
    BANNER("BANNER"),
    NATIVE("NATIVE"),
    INTERSTITIAL("INTERSTITIAL"),
    REWARDED("REWARDED");

    companion object {
        fun fromCode(code: String): AdFormat = values().firstOrNull { it.code.equals(code, ignoreCase = true) }
            ?: BANNER
    }
}

