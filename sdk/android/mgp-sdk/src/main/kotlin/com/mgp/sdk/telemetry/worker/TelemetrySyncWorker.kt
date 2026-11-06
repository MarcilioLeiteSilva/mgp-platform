package com.mgp.sdk.telemetry.worker

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.mgp.sdk.MGP
import com.mgp.sdk.core.DeviceContextExtractor
import com.mgp.sdk.telemetry.network.TelemetryHttpClient
import com.mgp.sdk.telemetry.network.TelemetryTransmissionResult
import com.mgp.sdk.telemetry.storage.TelemetryDatabaseHelper
import java.util.concurrent.TimeUnit

/**
 * Worker assíncrono para esvaziar o buffer local de telemetria em segundo plano via WorkManager.
 */
class TelemetrySyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val WORK_NAME = "mgp_telemetry_sync_work"

        /**
         * Enfileira o worker de sincronização com restrição de rede ativa.
         */
        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<TelemetrySyncWorker>()
                .setConstraints(constraints)
                .setInitialDelay(5, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.KEEP,
                request
            )
        }
    }

    override suspend fun doWork(): Result {
        val config = MGP.getConfig() ?: return Result.failure()
        val dbHelper = TelemetryDatabaseHelper(applicationContext)
        val httpClient = TelemetryHttpClient(config)

        val pendingEvents = dbHelper.getPendingEvents(limit = 50)
        if (pendingEvents.isEmpty()) {
            return Result.success()
        }

        val deviceContext = DeviceContextExtractor.extractDeviceContext(applicationContext)
        val appContext = DeviceContextExtractor.extractAppContext(applicationContext)
        val networkContext = DeviceContextExtractor.extractNetworkContext(applicationContext)

        val result = httpClient.transmitBatch(
            events = pendingEvents,
            deviceContext = deviceContext,
            appContext = appContext,
            networkContext = networkContext
        )

        return when (result) {
            is TelemetryTransmissionResult.Success -> {
                val sentIds = pendingEvents.map { it.eventId }
                dbHelper.deleteEvents(sentIds)
                if (config.debugMode) {
                    Log.d("MGP_SDK", "[SyncWorker] Sucesso: ${result.processedCount} eventos sincronizados.")
                }

                // Se ainda restarem eventos acumulados no banco, re-agenda nova rodada
                if (dbHelper.getEventsCount() > 0) {
                    schedule(applicationContext)
                }
                Result.success()
            }
            is TelemetryTransmissionResult.ClientError -> {
                // Erro 4xx (Bad Request, Token Inválido ou Nonce Replay): descarta os eventos inválidos para não poluir
                val badIds = pendingEvents.map { it.eventId }
                dbHelper.deleteEvents(badIds)
                Log.w("MGP_SDK", "[SyncWorker] Erro de cliente HTTP ${result.statusCode}: ${result.message}. Eventos descartados.")
                Result.success()
            }
            is TelemetryTransmissionResult.TransientError -> {
                Log.w("MGP_SDK", "[SyncWorker] Falha transitória de rede. Reagendando com backoff exponencial.")
                Result.retry()
            }
        }
    }
}

