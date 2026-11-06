import { CacheService } from './cache.service';

describe('CacheService (Deduplicação de Nonce, Cache Rápido e Frequency Capping)', () => {
  let cache: CacheService;

  beforeEach(() => {
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

  it('deve gerenciar Frequency Capping permitindo até o limite e bloqueando o excedente', async () => {
    const campaignId = 'cmp_test_cap';
    const advertisingId = 'user_ad_id_123';
    const limit = 2;

    // 1ª exibição: permitida
    const check1 = await cache.checkAndIncrementFrequency(campaignId, advertisingId, limit);
    expect(check1).toBe(true);

    // 2ª exibição: permitida
    const check2 = await cache.checkAndIncrementFrequency(campaignId, advertisingId, limit);
    expect(check2).toBe(true);

    // 3ª exibição: bloqueada pelo frequency capping
    const check3 = await cache.checkAndIncrementFrequency(campaignId, advertisingId, limit);
    expect(check3).toBe(false);
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
