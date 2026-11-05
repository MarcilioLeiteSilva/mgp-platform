import { AsoCronScheduler, ASO_CRON_SCHEDULES } from './aso-cron.scheduler';
import { AsoJobType } from '@mgp/contracts';

describe('AsoCronScheduler (Agendador de Tarefas Periódicas ASO)', () => {
  let scheduler: AsoCronScheduler;
  let mockQueue: any;

  beforeEach(() => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'scheduled-job' }),
      getRepeatableJobs: jest.fn().mockResolvedValue([
        { name: AsoJobType.DISPATCH_DAILY_RANKINGS, pattern: '0 3 * * *' },
      ]),
    };

    scheduler = new AsoCronScheduler(mockQueue);
  });

  it('deve registrar os agendamentos diário e semanal no BullMQ', async () => {
    await scheduler.registerSchedules();

    expect(mockQueue.add).toHaveBeenCalledTimes(2);

    // Checa agendamento diário
    expect(mockQueue.add).toHaveBeenCalledWith(
      ASO_CRON_SCHEDULES.DAILY_RANKINGS.jobType,
      {},
      expect.objectContaining({
        repeat: { pattern: ASO_CRON_SCHEDULES.DAILY_RANKINGS.cron },
      }),
    );

    // Checa agendamento semanal
    expect(mockQueue.add).toHaveBeenCalledWith(
      ASO_CRON_SCHEDULES.WEEKLY_METADATA_SYNC.jobType,
      {},
      expect.objectContaining({
        repeat: { pattern: ASO_CRON_SCHEDULES.WEEKLY_METADATA_SYNC.cron },
      }),
    );
  });

  it('deve listar jobs repetíveis ativos', async () => {
    const list = await scheduler.listRepeatableJobs();
    expect(list).toHaveLength(1);
    expect(mockQueue.getRepeatableJobs).toHaveBeenCalled();
  });
});

