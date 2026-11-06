import { Test, TestingModule } from '@nestjs/testing';
import { TelemetryController } from './telemetry.controller';
import { TelemetryIngestionService } from '../services/telemetry-ingestion.service';
import { TelemetryQueueService } from '../services/telemetry-queue.service';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../../../config/app-config.service';

describe('TelemetryController (REST API Ingestão e Métricas)', () => {
  let controller: TelemetryController;
  let mockIngestion: any;
  let mockQueue: any;

  beforeEach(async () => {
    mockIngestion = {
      ingestBatch: jest.fn().mockResolvedValue({
        success: true,
        batchId: 'batch_123',
        processedCount: 2,
        rejectedCount: 0,
        serverTime: '2026-11-06T14:30:00.000Z',
      }),
    };

    mockQueue = {
      getMetrics: jest.fn().mockResolvedValue({
        queueName: 'queue-telemetry',
        waiting: 5,
        active: 1,
        completed: 100,
        failed: 0,
        delayed: 0,
        isPaused: false,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelemetryController],
      providers: [
        { provide: TelemetryIngestionService, useValue: mockIngestion },
        { provide: TelemetryQueueService, useValue: mockQueue },
        { provide: JwtService, useValue: {} },
        { provide: AppConfigService, useValue: { jwtAccessSecret: 'test_sec' } },
      ],
    }).compile();

    controller = module.get<TelemetryController>(TelemetryController);
  });

  it('deve chamar ingestBatch com dados validados', async () => {
    const rawBody = {
      batchId: '11111111-2222-3333-4444-555555555555',
      sentAt: '2026-11-06T14:30:00.000Z',
      sdkKey: 'mgp_live_test_sdk_key_1234',
      device: {
        platform: 'ANDROID',
        osVersion: '14',
        deviceModel: 'Pixel',
        manufacturer: 'Google',
        screenWidth: 1080,
        screenHeight: 1920,
        screenDensity: 2.0,
      },
      app: {
        packageName: 'com.game',
        appVersion: '1.0',
        versionCode: 1,
      },
      events: [
        {
          eventId: '22222222-3333-4444-5555-666666666666',
          eventType: 'APP_OPEN',
          sessionId: 's1',
          timestamp: '2026-11-06T14:30:00.000Z',
          nonce: 'nonce_123456789012',
          signature: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        },
      ],
    };

    const req = { ip: '127.0.0.1' };
    const res = await controller.ingestBatch(rawBody, req);

    expect(res.success).toBe(true);
    expect(res.processedCount).toBe(2);
    expect(mockIngestion.ingestBatch).toHaveBeenCalled();
  });

  it('deve retornar métricas da fila de telemetria', async () => {
    const metrics = await controller.getQueueMetrics();
    expect(metrics.queueName).toBe('queue-telemetry');
    expect(metrics.waiting).toBe(5);
  });
});

