import { AsoRateLimiterService } from './aso-rate-limiter.service';

describe('AsoRateLimiterService (Rate Limiting, Concorrência e Backoff Exponencial)', () => {
  let rateLimiter: AsoRateLimiterService;

  beforeEach(() => {
    rateLimiter = new AsoRateLimiterService();
    // Configura delays mínimos para execução ultra-rápida nos testes unitários
    rateLimiter.configure({ maxConcurrency: 2, minDelayMs: 0 });
  });

  it('deve ser instanciado corretamente e iniciar com métricas zeradas', () => {
    expect(rateLimiter).toBeDefined();
    const metrics = rateLimiter.getMetrics();
    expect(metrics.totalExecuted).toBe(0);
    expect(metrics.totalRetried).toBe(0);
    expect(metrics.totalFailed).toBe(0);
    expect(metrics.activeCount).toBe(0);
  });

  it('deve executar uma função com sucesso e incrementar métricas de execução', async () => {
    const fn = jest.fn().mockResolvedValue('dados coletados');

    const result = await rateLimiter.execute(fn, 'test-success');

    expect(result).toBe('dados coletados');
    expect(fn).toHaveBeenCalledTimes(1);

    const metrics = rateLimiter.getMetrics();
    expect(metrics.totalExecuted).toBe(1);
    expect(metrics.totalRetried).toBe(0);
    expect(metrics.totalFailed).toBe(0);
  });

  it('deve aplicar retry exponencial em falhas temporárias e ter sucesso na tentativa subsequente', async () => {
    let callCount = 0;
    const fn = jest.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        const transientError: any = new Error('Google Play 503 Service Unavailable');
        transientError.status = 503;
        throw transientError;
      }
      return 'sucesso no retry';
    });

    const result = await rateLimiter.execute(fn, 'test-retry', 3, 10);

    expect(result).toBe('sucesso no retry');
    expect(fn).toHaveBeenCalledTimes(2);

    const metrics = rateLimiter.getMetrics();
    expect(metrics.totalExecuted).toBe(1);
    expect(metrics.totalRetried).toBe(1);
    expect(metrics.totalFailed).toBe(0);
  });

  it('NÃO deve aplicar retry para erros definitivos (ex: 404 App Not Found)', async () => {
    const notFoundError: any = new Error('App not found (404)');
    notFoundError.status = 404;
    const fn = jest.fn().mockRejectedValue(notFoundError);

    await expect(rateLimiter.execute(fn, 'test-404', 3, 10)).rejects.toThrow(
      'App not found (404)',
    );

    expect(fn).toHaveBeenCalledTimes(1); // Executou exatamente 1 vez sem retry

    const metrics = rateLimiter.getMetrics();
    expect(metrics.totalExecuted).toBe(0);
    expect(metrics.totalRetried).toBe(0);
    expect(metrics.totalFailed).toBe(1);
  });

  it('deve esgotar as tentativas de retry e lançar a exceção final se persistir o erro temporário', async () => {
    const persistentError: any = new Error('429 Too Many Requests');
    persistentError.status = 429;
    const fn = jest.fn().mockRejectedValue(persistentError);

    await expect(
      rateLimiter.execute(fn, 'test-exhausted-retries', 2, 5),
    ).rejects.toThrow('429 Too Many Requests');

    // 1 execução inicial + 2 retries = 3 chamadas
    expect(fn).toHaveBeenCalledTimes(3);

    const metrics = rateLimiter.getMetrics();
    expect(metrics.totalExecuted).toBe(0);
    expect(metrics.totalRetried).toBe(2);
    expect(metrics.totalFailed).toBe(1);
  });

  it('deve respeitar a fila de controle de concorrência simultânea', async () => {
    rateLimiter.configure({ maxConcurrency: 1, minDelayMs: 0 });

    const order: number[] = [];

    const task1 = rateLimiter.execute(async () => {
      await new Promise((r) => setTimeout(r, 20));
      order.push(1);
      return 1;
    });

    const task2 = rateLimiter.execute(async () => {
      order.push(2);
      return 2;
    });

    await Promise.all([task1, task2]);

    expect(order).toEqual([1, 2]);
  });
});

