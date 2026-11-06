package com.mgp.sdk.telemetry.storage

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import com.mgp.sdk.telemetry.TelemetryEvent
import com.mgp.sdk.telemetry.TelemetryEventType
import org.json.JSONObject

/**
 * Gerenciador de persistência local SQLite para buffer offline de eventos de telemetria.
 * Assegura que nenhum evento seja perdido em oscilações de rede ou modo avião.
 */
class TelemetryDatabaseHelper(context: Context) : SQLiteOpenHelper(
    context.applicationContext,
    DATABASE_NAME,
    null,
    DATABASE_VERSION
) {

    companion object {
        private const val DATABASE_NAME = "mgp_telemetry.db"
        private const val DATABASE_VERSION = 1

        const val TABLE_EVENTS = "telemetry_events"
        const val COL_ID = "id"
        const val COL_EVENT_ID = "event_id"
        const val COL_EVENT_TYPE = "event_type"
        const val COL_SESSION_ID = "session_id"
        const val COL_TIMESTAMP = "timestamp"
        const val COL_SEQUENCE_NUMBER = "sequence_number"
        const val COL_PROPERTIES_JSON = "properties_json"
        const val COL_NONCE = "nonce"
        const val COL_SIGNATURE = "signature"
        const val COL_CREATED_AT = "created_at"

        const val MAX_BUFFER_CAPACITY = 1000
    }

    override fun onCreate(db: SQLiteDatabase) {
        val createTableSql = """
            CREATE TABLE IF NOT EXISTS $TABLE_EVENTS (
                $COL_ID INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_EVENT_ID TEXT UNIQUE NOT NULL,
                $COL_EVENT_TYPE TEXT NOT NULL,
                $COL_SESSION_ID TEXT NOT NULL,
                $COL_TIMESTAMP TEXT NOT NULL,
                $COL_SEQUENCE_NUMBER INTEGER NOT NULL,
                $COL_PROPERTIES_JSON TEXT,
                $COL_NONCE TEXT NOT NULL,
                $COL_SIGNATURE TEXT NOT NULL,
                $COL_CREATED_AT INTEGER NOT NULL
            );
        """.trimIndent()

        val createIndexSql = "CREATE INDEX IF NOT EXISTS idx_telemetry_created ON $TABLE_EVENTS ($COL_CREATED_AT ASC);"

        db.execSQL(createTableSql)
        db.execSQL(createIndexSql)
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_EVENTS")
        onCreate(db)
    }

    /**
     * Persiste um evento de telemetria no banco local.
     */
    @Synchronized
    fun insertEvent(event: TelemetryEvent): Long {
        val db = writableDatabase
        purgeOldestIfCapacityExceeded(db)

        val propertiesJson = JSONObject(event.properties).toString()

        val values = ContentValues().apply {
            put(COL_EVENT_ID, event.eventId)
            put(COL_EVENT_TYPE, event.eventType.rawValue)
            put(COL_SESSION_ID, event.sessionId)
            put(COL_TIMESTAMP, event.timestamp)
            put(COL_SEQUENCE_NUMBER, event.sequenceNumber)
            put(COL_PROPERTIES_JSON, propertiesJson)
            put(COL_NONCE, event.nonce)
            put(COL_SIGNATURE, event.signature)
            put(COL_CREATED_AT, System.currentTimeMillis())
        }

        return db.insertWithOnConflict(TABLE_EVENTS, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    /**
     * Obtém um lote de eventos pendentes ordenados pelo mais antigo (FIFO).
     */
    @Synchronized
    fun getPendingEvents(limit: Int = 50): List<TelemetryEvent> {
        val events = mutableListOf<TelemetryEvent>()
        val db = readableDatabase

        val cursor = db.query(
            TABLE_EVENTS,
            null,
            null,
            null,
            null,
            null,
            "$COL_CREATED_AT ASC",
            limit.toString()
        )

        cursor.use { c ->
            val idxEventId = c.getColumnIndexOrThrow(COL_EVENT_ID)
            val idxEventType = c.getColumnIndexOrThrow(COL_EVENT_TYPE)
            val idxSessionId = c.getColumnIndexOrThrow(COL_SESSION_ID)
            val idxTimestamp = c.getColumnIndexOrThrow(COL_TIMESTAMP)
            val idxSeq = c.getColumnIndexOrThrow(COL_SEQUENCE_NUMBER)
            val idxProps = c.getColumnIndexOrThrow(COL_PROPERTIES_JSON)
            val idxNonce = c.getColumnIndexOrThrow(COL_NONCE)
            val idxSignature = c.getColumnIndexOrThrow(COL_SIGNATURE)

            while (c.moveToNext()) {
                val rawProps = c.getString(idxProps)
                val propertiesMap = mutableMapOf<String, Any?>()

                if (!rawProps.isNullOrBlank()) {
                    try {
                        val json = JSONObject(rawProps)
                        val keys = json.keys()
                        while (keys.hasNext()) {
                            val key = keys.next()
                            propertiesMap[key] = json.opt(key)
                        }
                    } catch (_: Throwable) {
                        // Ignora formatação corrompida de propriedades
                    }
                }

                val type = try {
                    TelemetryEventType.valueOf(c.getString(idxEventType))
                } catch (_: Throwable) {
                    TelemetryEventType.CUSTOM_EVENT
                }

                events.add(
                    TelemetryEvent(
                        eventId = c.getString(idxEventId),
                        eventType = type,
                        sessionId = c.getString(idxSessionId),
                        timestamp = c.getString(idxTimestamp),
                        sequenceNumber = c.getLong(idxSeq),
                        properties = propertiesMap,
                        nonce = c.getString(idxNonce),
                        signature = c.getString(idxSignature)
                    )
                )
            }
        }

        return events
    }

    /**
     * Remove do banco os eventos confirmados pelo backend.
     */
    @Synchronized
    fun deleteEvents(eventIds: List<String>) {
        if (eventIds.isEmpty()) return

        val db = writableDatabase
        val placeholders = eventIds.joinToString(",") { "?" }
        db.delete(TABLE_EVENTS, "$COL_EVENT_ID IN ($placeholders)", eventIds.toTypedArray())
    }

    /**
     * Retorna a contagem total de eventos armazenados no buffer local.
     */
    @Synchronized
    fun getEventsCount(): Long {
        val db = readableDatabase
        val cursor = db.rawQuery("SELECT COUNT(*) FROM $TABLE_EVENTS", null)
        return cursor.use { c ->
            if (c.moveToFirst()) c.getLong(0) else 0L
        }
    }

    /**
     * Purga os eventos mais antigos caso a capacidade máxima seja ultrapassada.
     */
    private fun purgeOldestIfCapacityExceeded(db: SQLiteDatabase) {
        val cursor = db.rawQuery("SELECT COUNT(*) FROM $TABLE_EVENTS", null)
        val count = cursor.use { c ->
            if (c.moveToFirst()) c.getLong(0) else 0L
        }

        if (count >= MAX_BUFFER_CAPACITY) {
            val deleteExcessSql = """
                DELETE FROM $TABLE_EVENTS WHERE $COL_ID IN (
                    SELECT $COL_ID FROM $TABLE_EVENTS ORDER BY $COL_CREATED_AT ASC LIMIT 100
                );
            """.trimIndent()
            db.execSQL(deleteExcessSql)
        }
    }
}

