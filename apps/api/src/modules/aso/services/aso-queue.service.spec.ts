import { Test, TestingModule } from '@nestjs/testing';
import { AsoQueueService } from './aso-queue.service';
import { AppConfigService } from '../../../config/app-config.service';
import { AsoJobType } from '@mgp/contracts';

describe('AsoQueueService (Produtor de Tarefas BullMQ ASO)', () => {
  let service: AsoQueueService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockImplementation((name, data) =>
        Promise.resolve({
          id: `mock-job-${Date.now()}`,
          name,
          data,
        }),
      ),
      getWaitingCount: jest.fn().mockResolvedValue(5),
      getActiveCount: jest.fn().mockResolvedValue(2),
      getCompletedCount: jest.fn().mockResolvedValue(100),
      getFailedCount: jest.fn().mockResolvedValue(1),
      getDelayedCount: jest.fn().mockResolvedValue(10),
      isPaused: jest.fn().mockResolvedValue(false),
      close: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsoQueueService,
        {
          provide: AppConfigService,
          useValue: {
            redisUrl: 'redis://localhost:6379',
          },
        },
      ],
    }).compile();

    service = module.get<AsoQueueService>(AsoQueueService);
    service.setQueueClient(mockQueue);
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  it('enqueueSyncAppMetadata - deve enfileirar tarefa de sincronização de app', async () => {
    const result = await service.enqueueSyncAppMetadata('app-1', 'org-1', true);

    expect(result.status).toBe('ENQUEUED');
    expect(result.jobType).toBe(AsoJobType.SYNC_APP_METADATA);
    expect(mockQueue.add).toHaveBeenCalledWith(
      AsoJobType.SYNC_APP_METADATA,
      {
        asoAppId: 'app-1',
        organizationId: 'org-1',
        forceAudit: true,
      },
      expect.any(Object),
    );
  });

  it('enqueueCheckKeywordRank - deve enfileirar checagem de rank de keyword', async () => {
    const result = await service.enqueueCheckKeywordRank({
      asoAppId: 'app-1',
      appKeywordId: 'kw-1',
      keyword: 'banco digital',
      appId: 'com.nu.production',
      country: 'br',
      lang: 'pt',
      organizationId: 'org-1',
    });

    expect(result.status).toBe('ENQUEUED');
    expect(result.jobType).toBe(AsoJobType.CHECK_KEYWORD_RANK);
    expect(mockQueue.add).toHaveBeenCalledWith(
      AsoJobType.CHECK_KEYWORD_RANK,
      expect.objectContaining({ keyword: 'banco digital' }),
      expect.any(Object),
    );
  });

  it('enqueueDailyRankingsDispatch - deve enfileirar job de disparo em lote de rankings', async () => {
    const result = await service.enqueueDailyRankingsDispatch('org-1');

    expect(result.status).toBe('ENQUEUED');
    expect(result.jobType).toBe(AsoJobType.DISPATCH_DAILY_RANKINGS);
    expect(mockQueue.add).toHaveBeenCalledWith(
      AsoJobType.DISPATCH_DAILY_RANKINGS,
      { organizationId: 'org-1' },
      expect.any(Object),
    );
  });

  it('enqueueMetadataSyncDispatch - deve enfileirar job de disparo em lote de metadados', async () => {
    const result = await service.enqueueMetadataSyncDispatch('org-1');

    expect(result.status).toBe('ENQUEUED');
    expect(result.jobType).toBe(AsoJobType.DISPATCH_METADATA_SYNC);
    expect(mockQueue.add).toHaveBeenCalledWith(
      AsoJobType.DISPATCH_METADATA_SYNC,
      { organizationId: 'org-1' },
      expect.any(Object),
    );
  });

  it('enqueueAuditApp - deve enfileirar recálculo de auditoria', async () => {
    const result = await service.enqueueAuditApp('app-1', 'org-1');

    expect(result.status).toBe('ENQUEUED');
    expect(result.jobType).toBe(AsoJobType.AUDIT_APP);
    expect(mockQueue.add).toHaveBeenCalledWith(
      AsoJobType.AUDIT_APP,
      { asoAppId: 'app-1', organizationId: 'org-1' },
      expect.any(Object),
    );
  });

  it('getQueueMetrics - deve retornar contadores operacionais da fila', async () => {
    const metrics = await service.getQueueMetrics();

    expect(metrics.queueName).toBe('queue-aso-sync');
    expect(metrics.waiting).toBe(5);
    expect(metrics.active).toBe(2);
    expect(metrics.completed).toBe(100);
    expect(metrics.failed).toBe(1);
    expect(metrics.delayed).toBe(10);
    expect(metrics.paused).toBe(false);
  });
});

