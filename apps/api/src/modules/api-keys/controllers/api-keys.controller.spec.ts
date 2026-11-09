import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from '../services/api-keys.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';

describe('ApiKeysController (Painel de Gestão de Chaves)', () => {
  let controller: ApiKeysController;
  let service: any;

  const mockApiKeyDto = {
    id: 'key-1',
    organizationId: 'org-1',
    name: 'Chave de Produção',
    keyPrefix: 'mgp_live_abc12345',
    scopes: ['aso:read', 'estimates:read'],
    rateLimitPerMin: 60,
    quotaMonthly: 10000,
    quotaUsed: 42,
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    isRevoked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    service = {
      createApiKey: jest.fn().mockResolvedValue({
        apiKey: mockApiKeyDto,
        plainTextKey: 'mgp_live_fullplainsecret',
      }),
      listKeys: jest.fn().mockResolvedValue([mockApiKeyDto]),
      getStats: jest.fn().mockResolvedValue({
        totalKeys: 1,
        activeKeys: 1,
        revokedKeys: 0,
        monthlyQuota: 10000,
        monthlyUsed: 42,
        remainingQuota: 9958,
      }),
      revokeKey: jest.fn().mockResolvedValue({
        ...mockApiKeyDto,
        revokedAt: new Date().toISOString(),
        isRevoked: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiKeysController],
      providers: [{ provide: ApiKeysService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ApiKeysController>(ApiKeysController);
  });

  it('deve ser instanciado corretamente', () => {
    expect(controller).toBeDefined();
  });

  it('POST /api/v1/api-keys deve criar nova chave', async () => {
    const result = await controller.createApiKey('org-1', {
      name: 'Chave de Produção',
    });

    expect(service.createApiKey).toHaveBeenCalledWith('org-1', {
      name: 'Chave de Produção',
    });
    expect(result.plainTextKey).toBe('mgp_live_fullplainsecret');
    expect(result.apiKey.id).toBe('key-1');
  });

  it('GET /api/v1/api-keys deve listar chaves da organização', async () => {
    const result = await controller.listKeys('org-1');

    expect(service.listKeys).toHaveBeenCalledWith('org-1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Chave de Produção');
  });

  it('GET /api/v1/api-keys/stats deve retornar métricas de quota', async () => {
    const result = await controller.getStats('org-1');

    expect(service.getStats).toHaveBeenCalledWith('org-1');
    expect(result.totalKeys).toBe(1);
    expect(result.remainingQuota).toBe(9958);
  });

  it('POST /api/v1/api-keys/:id/revoke deve revogar a chave', async () => {
    const result = await controller.revokeKey('key-1', 'org-1');

    expect(service.revokeKey).toHaveBeenCalledWith('key-1', 'org-1');
    expect(result.isRevoked).toBe(true);
  });
});
