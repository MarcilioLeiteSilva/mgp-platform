import { Queue } from 'bullmq';
import { AsoJobType } from '@mgp/contracts';

export const ASO_CRON_SCHEDULES = {
  DAILY_RANKINGS: {
    name: 'schedule-daily-rankings-03am',
    cron: '0 3 * * *', // Todos os dias às 03:00 UTC
    jobType: AsoJobType.DISPATCH_DAILY_RANKINGS,
    description: 'Disparo diário da checagem de ranking das palavras-chave ativas',
  },
  WEEKLY_METADATA_SYNC: {
    name: 'schedule-weekly-metadata-sync-04am',
    cron: '0 4 * * 0', // Todo domingo às 04:00 UTC
    jobType: AsoJobType.DISPATCH_METADATA_SYNC,
    description: 'Sincronização semanal de metadados e auditoria dos apps monitorados',
  },
} as const;

export class AsoCronScheduler {
  constructor(private readonly queue: Queue) {}

  /**
   * Registra os cron jobs recorrentes da fila queue-aso-sync no Redis.
   */
  async registerSchedules(): Promise<void> {
    console.info('[AsoCronScheduler] Registrando rotinas agendadas (Cron) no BullMQ...');

    // 1. Agendamento Diário de Rankings
    await this.queue.add(
      ASO_CRON_SCHEDULES.DAILY_RANKINGS.jobType,
      {},
      {
        repeat: {
          pattern: ASO_CRON_SCHEDULES.DAILY_RANKINGS.cron,
        },
        jobId: ASO_CRON_SCHEDULES.DAILY_RANKINGS.name,
        removeOnComplete: true,
      },
    );
    console.info(
      `[AsoCronScheduler] Registrado: ${ASO_CRON_SCHEDULES.DAILY_RANKINGS.name} (${ASO_CRON_SCHEDULES.DAILY_RANKINGS.cron})`,
    );

    // 2. Agendamento Semanal de Sincronização de Metadados
    await this.queue.add(
      ASO_CRON_SCHEDULES.WEEKLY_METADATA_SYNC.jobType,
      {},
      {
        repeat: {
          pattern: ASO_CRON_SCHEDULES.WEEKLY_METADATA_SYNC.cron,
        },
        jobId: ASO_CRON_SCHEDULES.WEEKLY_METADATA_SYNC.name,
        removeOnComplete: true,
      },
    );
    console.info(
      `[AsoCronScheduler] Registrado: ${ASO_CRON_SCHEDULES.WEEKLY_METADATA_SYNC.name} (${ASO_CRON_SCHEDULES.WEEKLY_METADATA_SYNC.cron})`,
    );
  }

  /**
   * Lista os jobs repetíveis configurados na fila.
   */
  async listRepeatableJobs(): Promise<any[]> {
    return this.queue.getRepeatableJobs();
  }
}

