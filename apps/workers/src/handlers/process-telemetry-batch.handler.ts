import { PrismaClient } from '@mgp/database';
import { TelemetryBatchJobPayload } from '@mgp/contracts';

export interface TelemetryBatchProcessResult {
  success: boolean;
  batchId: string;
  sessionsUpdated: number;
  eventsInserted: number;
  error?: string;
}

/**
 * Handler responsável por processar o lote de telemetria, atualizando o ciclo de vida
 * das sessões e persistindo os eventos analíticos no banco de dados relacional.
 */
export async function handleProcessTelemetryBatch(
  data: TelemetryBatchJobPayload,
  deps: { prisma: PrismaClient },
): Promise<TelemetryBatchProcessResult> {
  const { batch, appId, organizationId, clientIp } = data;
  const { device, network, events } = batch;

  if (!events || events.length === 0) {
    return {
      success: true,
      batchId: data.batchId,
      sessionsUpdated: 0,
      eventsInserted: 0,
    };
  }

  const prisma = deps.prisma;
  const sessionsMap = new Map<string, {
    sessionId: string;
    startedAt: Date;
    endedAt?: Date;
    durationSeconds: number;
    lastHeartbeatAt?: Date;
  }>();

  // 1. Agrupa eventos por sessão para atualizar o ciclo de vida
  for (const ev of events) {
    const evDate = new Date(ev.timestamp);
    let session = sessionsMap.get(ev.sessionId);

    if (!session) {
      session = {
        sessionId: ev.sessionId,
        startedAt: evDate,
        durationSeconds: 0,
      };
      sessionsMap.set(ev.sessionId, session);
    }

    if (ev.eventType === 'SESSION_START') {
      session.startedAt = evDate;
    } else if (ev.eventType === 'HEARTBEAT') {
      session.lastHeartbeatAt = evDate;
      const activeDuration = Number(ev.properties?.activeDurationSeconds) || 60;
      session.durationSeconds = Math.max(session.durationSeconds, activeDuration);
    } else if (ev.eventType === 'SESSION_END') {
      session.endedAt = evDate;
      const totalDuration = Number(ev.properties?.totalDurationSeconds) || session.durationSeconds;
      session.durationSeconds = Math.max(session.durationSeconds, totalDuration);
    }
  }

  let sessionsUpdated = 0;

  // 2. Persiste / Atualiza sessões na tabela telemetry_sessions
  for (const sessionData of sessionsMap.values()) {
    try {
      await prisma.telemetrySession.upsert({
        where: { sessionId: sessionData.sessionId },
        update: {
          endedAt: sessionData.endedAt,
          durationSeconds: sessionData.durationSeconds,
          lastHeartbeatAt: sessionData.lastHeartbeatAt,
          updatedAt: new Date(),
        },
        create: {
          sessionId: sessionData.sessionId,
          appId,
          organizationId,
          startedAt: sessionData.startedAt,
          endedAt: sessionData.endedAt,
          durationSeconds: sessionData.durationSeconds,
          lastHeartbeatAt: sessionData.lastHeartbeatAt,
          deviceModel: device.deviceModel,
          osVersion: device.osVersion,
          locale: device.locale,
          timezone: device.timezone,
          networkType: network.networkType,
          carrier: network.carrier,
          ipAddress: clientIp,
          isEmulator: device.isEmulator,
          isRooted: device.isRooted,
          advertisingId: device.advertisingId,
          isLimitAdTracking: device.isLimitAdTracking,
        },
      });
      sessionsUpdated++;
    } catch (err: any) {
      console.warn(`[TelemetryHandler] Falha ao upsert na sessão ${sessionData.sessionId}: ${err.message}`);
    }
  }

  // 3. Persiste registros de eventos na tabela telemetry_events
  const eventRecords = events.map((ev) => ({
    eventId: ev.eventId,
    sessionId: ev.sessionId,
    appId,
    organizationId,
    eventType: ev.eventType,
    sequenceNumber: ev.sequenceNumber || null,
    properties: ev.properties || {},
    timestamp: new Date(ev.timestamp),
    nonce: ev.nonce,
    signature: ev.signature,
    isFraudulent: device.isEmulator || device.isRooted,
    fraudReason: device.isEmulator ? 'EMULATOR_ENVIRONMENT' : (device.isRooted ? 'ROOTED_DEVICE' : null),
  }));

  let eventsInserted = 0;
  try {
    const insertResult = await prisma.telemetryEventRecord.createMany({
      data: eventRecords,
      skipDuplicates: true,
    });
    eventsInserted = insertResult.count;
  } catch (err: any) {
    console.warn(`[TelemetryHandler] Falha ao persistir eventos em lote: ${err.message}`);
  }

  return {
    success: true,
    batchId: data.batchId,
    sessionsUpdated,
    eventsInserted,
  };
}

