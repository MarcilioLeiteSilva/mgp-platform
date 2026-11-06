import { CacheService } from './cache.service';

describe('CacheService (Deduplicação de Nonce e Cache Rápido)', () => {
  let cache: CacheService;

  beforeEach(() => {
    // Usa URL de teste; opera com fallback defensivo em memória
    cache = new CacheService('redis://127.0.0.1:6379');
  });

  afterEach(async () => {
    await cache.close();
  });

  it('deve aceitar nonce inédito e rejeitar reenvio imediato (Replay Attack)', async () => {
    const nonce = 'unique_nonce_' + Math.random().toString(36).slice(2);

    const firstCheck = await cache.checkAndRecordNonce(nonce, 60);
    expect(firstCheck).toBe(true);

    const secondCheck = await cache.checkAndRecordNonce(nonce, 60);
    expect(secondCheck).toBe(false);
  });

  it('deve armazenar e recuperar dados do cache em memória', async () => {
    const testData = { id: 'app_1', name: 'Meu App' };
    await cache.set('test:key', testData, 10);

    const retrieved = await cache.get<typeof testData>('test:key');
    expect(retrieved).toEqual(testData);
  });

  it('deve retornar null para chaves inexistentes', async () => {
    const retrieved = await cache.get('non_existent_key');
    expect(retrieved).toBeNull();
  });
});

