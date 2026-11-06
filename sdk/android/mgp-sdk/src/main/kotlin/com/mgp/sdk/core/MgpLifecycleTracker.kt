package com.mgp.sdk.core

import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import com.mgp.sdk.MgpConfig
import com.mgp.sdk.telemetry.TelemetryEventType
import com.mgp.sdk.telemetry.TelemetryManager
import java.util.UUID

/**
 * Observador de ciclo de vida do processo da aplicação (Foreground / Background).
 * Controla os eventos compulsórios APP_OPEN, SESSION_START, HEARTBEAT e SESSION_END.
 */
class MgpLifecycleTracker(
    private val config: MgpConfig,
    private val telemetryManager: TelemetryManager
) : DefaultLifecycleObserver {

    private var currentSessionId: String = UUID.randomUUID().toString()
    private var isAppInForeground: Boolean = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private var heartbeatRunnable: Runnable? = null
    private var sessionDurationSeconds: Long = 0L

    fun startTracking() {
        mainHandler.post {
            try {
                ProcessLifecycleOwner.get().lifecycle.addObserver(this)
                if (config.debugMode) {
                    Log.d("MGP_SDK", "[Lifecycle] Observador de ciclo de vida registrado com sucesso.")
                }
            } catch (e: Throwable) {
                Log.w("MGP_SDK", "[Lifecycle] Aviso: Não foi possível registrar ProcessLifecycleOwner: ${e.message}")
            }
        }
    }

    override fun onStart(owner: LifecycleOwner) {
        isAppInForeground = true
        currentSessionId = UUID.randomUUID().toString()
        sessionDurationSeconds = 0L

        if (config.autoCollectLifecycle) {
            telemetryManager.enqueueEvent(
                eventType = TelemetryEventType.SESSION_START,
                sessionId = currentSessionId,
                properties = mapOf("entryPoint" to "APP_FOREGROUND")
            )
        }

        startHeartbeatLoop()
    }

    override fun onStop(owner: LifecycleOwner) {
        isAppInForeground = false
        stopHeartbeatLoop()

        if (config.autoCollectLifecycle) {
            telemetryManager.enqueueEvent(
                eventType = TelemetryEventType.SESSION_END,
                sessionId = currentSessionId,
                properties = mapOf("totalDurationSeconds" to sessionDurationSeconds)
            )
            telemetryManager.flushAsync()
        }
    }

    private fun startHeartbeatLoop() {
        stopHeartbeatLoop()

        val intervalMillis = config.heartbeatIntervalSeconds * 1000L
        heartbeatRunnable = object : Runnable {
            override fun run() {
                if (!isAppInForeground) return

                sessionDurationSeconds += config.heartbeatIntervalSeconds
                telemetryManager.enqueueEvent(
                    eventType = TelemetryEventType.HEARTBEAT,
                    sessionId = currentSessionId,
                    properties = mapOf("activeDurationSeconds" to sessionDurationSeconds)
                )

                mainHandler.postDelayed(this, intervalMillis)
            }
        }

        mainHandler.postDelayed(heartbeatRunnable!!, intervalMillis)
    }

    private fun stopHeartbeatLoop() {
        heartbeatRunnable?.let {
            mainHandler.removeCallbacks(it)
            heartbeatRunnable = null
        }
    }

    fun getCurrentSessionId(): String = currentSessionId
}

