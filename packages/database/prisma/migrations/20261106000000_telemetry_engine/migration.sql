-- CreateTable
CREATE TABLE "telemetry_sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "last_heartbeat_at" TIMESTAMP(3),
    "device_model" TEXT,
    "os_version" TEXT,
    "locale" TEXT,
    "timezone" TEXT,
    "network_type" TEXT,
    "carrier" TEXT,
    "ip_address" TEXT,
    "is_emulator" BOOLEAN NOT NULL DEFAULT false,
    "is_rooted" BOOLEAN NOT NULL DEFAULT false,
    "advertising_id" TEXT,
    "is_limit_ad_tracking" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "telemetry_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_events" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "sequence_number" INTEGER,
    "properties" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "nonce" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "is_fraudulent" BOOLEAN NOT NULL DEFAULT false,
    "fraud_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_sessions_session_id_key" ON "telemetry_sessions"("session_id");

-- CreateIndex
CREATE INDEX "telemetry_sessions_app_id_started_at_idx" ON "telemetry_sessions"("app_id", "started_at");

-- CreateIndex
CREATE INDEX "telemetry_sessions_organization_id_created_at_idx" ON "telemetry_sessions"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_events_event_id_key" ON "telemetry_events"("event_id");

-- CreateIndex
CREATE INDEX "telemetry_events_app_id_event_type_timestamp_idx" ON "telemetry_events"("app_id", "event_type", "timestamp");

-- CreateIndex
CREATE INDEX "telemetry_events_session_id_idx" ON "telemetry_events"("session_id");

-- CreateIndex
CREATE INDEX "telemetry_events_organization_id_created_at_idx" ON "telemetry_events"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "telemetry_sessions" ADD CONSTRAINT "telemetry_sessions_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_sessions" ADD CONSTRAINT "telemetry_sessions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "telemetry_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "telemetry_events" ADD CONSTRAINT "telemetry_events_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

