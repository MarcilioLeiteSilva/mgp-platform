package com.mgp.sdk

/**
 * Configurações de inicialização do MGP Android SDK.
 *
 * @property sdkKey Chave de identificação da aplicação obtida no painel MGP.
 * @property adServerUrl Endpoint base do Ad Server de ultra-baixa latência.
 * @property apiUrl Endpoint base da API central REST.
 * @property debugMode Habilita logs detalhados no Logcat para diagnóstico durante o desenvolvimento.
 * @property autoCollectLifecycle Habilita rastreamento automático de ciclo de vida (APP_OPEN, SESSION_START, HEARTBEAT).
 * @property heartbeatIntervalSeconds Intervalo em segundos entre pulsos de presença e duração ativa (padrão: 60s).
 */
data class MgpConfig(
    val sdkKey: String,
    val adServerUrl: String = "https://mgp-production-mgp-adserver.gtalg3.easypanel.host",
    val apiUrl: String = "https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1",
    val debugMode: Boolean = false,
    val autoCollectLifecycle: Boolean = true,
    val heartbeatIntervalSeconds: Long = 60L
) {
    init {
        require(sdkKey.isNotBlank()) { "MGP SDK Error: A sdkKey não pode ser vazia ou em branco." }
        require(heartbeatIntervalSeconds >= 10L) { "MGP SDK Error: O heartbeat não pode ser inferior a 10 segundos." }
    }

    class Builder(private val sdkKey: String) {
        private var adServerUrl: String = "https://mgp-production-mgp-adserver.gtalg3.easypanel.host"
        private var apiUrl: String = "https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1"
        private var debugMode: Boolean = false
        private var autoCollectLifecycle: Boolean = true
        private var heartbeatIntervalSeconds: Long = 60L

        fun setAdServerUrl(url: String) = apply { this.adServerUrl = url }
        fun setApiUrl(url: String) = apply { this.apiUrl = url }
        fun setDebugMode(debug: Boolean) = apply { this.debugMode = debug }
        fun setAutoCollectLifecycle(auto: Boolean) = apply { this.autoCollectLifecycle = auto }
        fun setHeartbeatInterval(seconds: Long) = apply { this.heartbeatIntervalSeconds = seconds }

        fun build(): MgpConfig = MgpConfig(
            sdkKey = sdkKey,
            adServerUrl = adServerUrl,
            apiUrl = apiUrl,
            debugMode = debugMode,
            autoCollectLifecycle = autoCollectLifecycle,
            heartbeatIntervalSeconds = heartbeatIntervalSeconds
        )
    }
}

