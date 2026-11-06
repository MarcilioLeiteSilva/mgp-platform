import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { TelemetryIngestionService } from './telemetry-ingestion.service';
import { TelemetryAntifraudService } from './telemetry-antifraud.service';
import { TelemetryQueueService } from './telemetry-queue.service';
import { PrismaService } from '../../../database/prisma.service';
import { TelemetryBatchDto } from '@mgp/contracts';

describe('TelemetryIngestionService (Ingestão e Validação de Lotes)', () => {
  let service: TelemetryIngestionService;
  let mockPrisma: any;
  let mockAntifraud: any;
  let mockQueue: any;

  beforeEach(async () => {
    mockPrisma = {
      app: {
        findUnique: jest.fn(),
      },
    };

    mockAntifraud = {
      validateHmacSignature: jest.fn(),
      validateTimestamp: jest.fn(),
      checkAndRecordNonce: jest.fn(),
    };

    mockQueue = {
      enqueueBatch: jest.fn().mockResolvedValue({ jobId: 'job_test_123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryIngestionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TelemetryAntifraudService, useValue: mockAntifraud },
        { provide: TelemetryQueueService, useValue: mockQueue },
      ],
    }).compile();

    service = module.get<TelemetryIngestionService>(TelemetryIngestionService);
  });

  const validBatch: TelemetryBatchDto = {
    batchId: '11111111-2222-3333-4444-555555555555',
    sentAt: '2026-11-06T14:30:00.000Z',
    sdkKey: 'mgp_live_sdk_key_123',
    device: {
      platform: 'ANDROID',
      osVersion: '14',
      deviceModel: 'Pixel 8',
      manufacturer: 'Google',
      screenWidth: 1080,
      screenHeight: 2400,
      screenDensity: 2.625,
      locale: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      isLimitAdTracking: false,
      isEmulator: false,
      isRooted: false,
    },
    app: {
      packageName: 'com.acme.game',
      appVersion: '1.0.0',
      versionCode: 100,
      sdkVersion: '0.1.0',
    },
    network: {
      networkType: 'WIFI',
      isVpnActive: false,
    },
    events: [
      {
        eventId: '22222222-3333-4444-5555-666666666666',
        eventType: 'SESSION_START',
        sessionId: 'sess_1',
        timestamp: '2026-11-06T14:29:50.000Z',
        sequenceNumber: 1,
        nonce: 'nonce_1',
        signature: 'valid_sig_1',
        properties: {},
      },
    ],
  };

  it('deve processar e enfileirar lote válido com sucesso', async () => {
    mockPrisma.app.findUnique.mockResolvedValue({
      id: 'app_1',
      organizationId: 'org_1',
      status: 'ACTIVE',
      packageName: 'com.acme.game',
      sdkKey: 'mgp_live_sdk_key_123',
    });

    mockAntifraud.validateHmacSignature.mockReturnValue(true);
    mockAntifraud.validateTimestamp.mockReturnValue(true);
    mockAntifraud.checkAndRecordNonce.mockResolvedValue(true);

    const result = await service.ingestBatch(validBatch, '192.168.1.1');

    expect(result.success).toBe(true);
    expect(result.processedCount).toBe(1);
    expect(result.rejectedCount).toBe(0);
    expect(mockQueue.enqueueBatch).toHaveBeenCalled();
  });

  it('deve lançar UnauthorizedException para SDK Key inexistente', async () => {
    mockPrisma.app.findUnique.mockResolvedValue(null);

    await expect(service.ingestBatch(validBatch)).rejects.toThrow(UnauthorizedException);
  });

  it('deve lançar UnauthorizedException se o aplicativo estiver suspenso', async () => {
    mockPrisma.app.findUnique.mockResolvedValue({
      id: 'app_1',
      organizationId: 'org_1',
      status: 'SUSPENDED',
      packageName: 'com.acme.game',
      sdkKey: 'mgp_live_sdk_key_123',
    });

    await expect(service.ingestBatch(validBatch)).rejects.toThrow(UnauthorizedException);
  });

  it('deve rejeitar eventos com assinatura inválida e aceitar os válidos', async () => {
    mockPrisma.app.findUnique.mockResolvedValue({
      id: 'app_1',
      organizationId: 'org_1',
      status: 'ACTIVE',
      packageName: 'com.acme.game',
      sdkKey: 'mgp_live_sdk_key_123',
    });

    const batchWith2Events: TelemetryBatchDto = {
      ...validBatch,
      events: [
        validBatch.events[0],
        {
          eventId: '33333333-4444-5555-6666-777777777777',
          eventType: 'HEARTBEAT',
          sessionId: 'sess_1',
          timestamp: '2026-11-06T14:30:50.000Z',
          sequenceNumber: 2,
          nonce: 'nonce_2',
          signature: 'bad_sig',
          properties: {},
        },
      ],
    };

    mockAntifraud.validateHmacSignature
      .mockReturnValueOnce(true)  // Evento 1 válido
      .mockReturnValueOnce(false); // Evento 2 inválido

    mockAntifraud.validateTimestamp.mockReturnValue(true);
    mockAntifraud.checkAndRecordNonce.mockResolvedValue(true);

    const result = await service.ingestBatch(batchWith2Events);

    expect(result.success).toBe(true);
    expect(result.processedCount).toBe(1);
    expect(result.rejectedCount).toBe(1);
  });
});

