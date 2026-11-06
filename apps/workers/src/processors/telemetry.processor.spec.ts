import { TelemetryProcessor } from './telemetry.processor';
import { TelemetryBatchJobPayload } from '@mgp/contracts';

describe('TelemetryProcessor & handleProcessTelemetryBatch', () => {
  let processor: TelemetryProcessor;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      telemetrySession: {
        upsert: jest.fn().mockResolvedValue({ id: 'session-row-1' }),
      },
      telemetryEventRecord: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    processor = new TelemetryProcessor(mockPrisma);
  });

  const baseJobData: TelemetryBatchJobPayload = {
    batchId: 'batch-test-123',
    appId: 'app-001',
    organizationId: 'org-001',
    clientIp: '192.168.1.100',
    enqueuedAt: '2026-11-06T15:00:00.000Z',
    batch: {
      appId: 'app-001',
      device: {
        platform: 'ANDROID',
        manufacturer: 'Google',
        deviceModel: 'Pixel 8',
        osVersion: 'Android 14',
        screenWidth: 1080,
        screenHeight: 2400,
        screenDensity: 2.6,
        locale: 'pt_BR',
        timezone: 'America/Sao_Paulo',
        isEmulator: false,
        isRooted: false,
        advertisingId: 'gaid-valid-uuid',
        isLimitAdTracking: false,
      },
      network: {
        networkType: 'WIFI',
        carrier: 'Vivo',
        isVpnActive: false,
      },
      events: [
        {
          eventId: 'ev-001',
          sessionId: 'session-alpha',
          eventType: 'SESSION_START',
          timestamp: '2026-11-06T15:00:00.000Z',
          nonce: '00000000-0000-4000-8000-000000000001',
          properties: {},
          signature: 'sig1',
        },
        {
          eventId: 'ev-002',
          sessionId: 'session-alpha',
          eventType: 'HEARTBEAT',
          timestamp: '2026-11-06T15:01:00.000Z',
          nonce: '00000000-0000-4000-8000-000000000002',
          properties: {
            activeDurationSeconds: 60,
          },
          signature: 'sig2',
        },
      ],
    },
  };

  it('deve processar lote de telemetria com sucesso atualizando sessões e inserindo eventos', async () => {
    const jobMock = {
      data: baseJobData,
    } as any;

    const result = await processor.process(jobMock);

    expect(result.success).toBe(true);
    expect(result.batchId).toBe('batch-test-123');
    expect(result.sessionsUpdated).toBe(1);
    expect(result.eventsInserted).toBe(2);

    expect(mockPrisma.telemetrySession.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sessionId: 'session-alpha' },
        create: expect.objectContaining({
          sessionId: 'session-alpha',
          appId: 'app-001',
          organizationId: 'org-001',
          deviceModel: 'Pixel 8',
          ipAddress: '192.168.1.100',
          isEmulator: false,
          isRooted: false,
        }),
      }),
    );

    expect(mockPrisma.telemetryEventRecord.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          eventId: 'ev-001',
          sessionId: 'session-alpha',
          eventType: 'SESSION_START',
          isFraudulent: false,
          fraudReason: null,
        }),
        expect.objectContaining({
          eventId: 'ev-002',
          sessionId: 'session-alpha',
          eventType: 'HEARTBEAT',
          isFraudulent: false,
          fraudReason: null,
        }),
      ]),
      skipDuplicates: true,
    });
  });

  it('deve marcar eventos como fraudulentos caso o dispositivo seja emulador ou rooted', async () => {
    const emulatorJobData: TelemetryBatchJobPayload = {
      ...baseJobData,
      batch: {
        ...baseJobData.batch,
        device: {
          ...baseJobData.batch.device,
          isEmulator: true,
        },
        events: [
          {
            eventId: 'ev-emu-1',
            sessionId: 'session-emu',
            eventType: 'SESSION_START',
            timestamp: '2026-11-06T15:00:00.000Z',
            nonce: '00000000-0000-4000-8000-000000000003',
            properties: {},
            signature: 'sig3',
          },
        ],
      },
    };

    const result = await processor.process({ data: emulatorJobData } as any);

    expect(result.success).toBe(true);
    expect(mockPrisma.telemetryEventRecord.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventId: 'ev-emu-1',
          isFraudulent: true,
          fraudReason: 'EMULATOR_ENVIRONMENT',
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('deve tratar lotes vazios sem acionar o Prisma', async () => {
    const emptyJobData: TelemetryBatchJobPayload = {
      ...baseJobData,
      batch: {
        ...baseJobData.batch,
        events: [],
      },
    };

    const result = await processor.process({ data: emptyJobData } as any);

    expect(result.success).toBe(true);
    expect(result.sessionsUpdated).toBe(0);
    expect(result.eventsInserted).toBe(0);
    expect(mockPrisma.telemetrySession.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.telemetryEventRecord.createMany).not.toHaveBeenCalled();
  });

  it('deve capturar falhas pontuais de banco sem derrubar a execução do worker', async () => {
    mockPrisma.telemetrySession.upsert.mockRejectedValueOnce(new Error('DB Connection Timeout'));
    mockPrisma.telemetryEventRecord.createMany.mockRejectedValueOnce(new Error('Constraint Failure'));

    const result = await processor.process({ data: baseJobData } as any);

    expect(result.success).toBe(true);
    expect(result.sessionsUpdated).toBe(0);
    expect(result.eventsInserted).toBe(0);
  });
});
