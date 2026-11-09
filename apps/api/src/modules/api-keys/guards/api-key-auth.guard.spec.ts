import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { ApiKeysService } from '../services/api-keys.service';

describe('ApiKeyAuthGuard', () => {
  let guard: ApiKeyAuthGuard;
  let service: any;
  let reflector: any;

  beforeEach(async () => {
    service = {
      validateAndConsumeKey: jest.fn(),
    };
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue('aso:read'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyAuthGuard,
        { provide: ApiKeysService, useValue: service },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get<ApiKeyAuthGuard>(ApiKeyAuthGuard);
  });

  const createMockContext = (headers: Record<string, string>) => {
    const request: any = { headers };
    const response: any = { setHeader: jest.fn() };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('deve extrair chave do cabeçalho X-API-Key e autenticar com sucesso', async () => {
    service.validateAndConsumeKey.mockResolvedValue({
      organizationId: 'org-test',
      keyId: 'key-test',
      quotaUsed: 50,
      quotaRemaining: 9950,
    });

    const context = createMockContext({ 'x-api-key': 'mgp_live_secret123' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(service.validateAndConsumeKey).toHaveBeenCalledWith(
      'mgp_live_secret123',
      'aso:read',
    );
  });

  it('deve extrair chave do cabeçalho Authorization: Bearer mgp_live_...', async () => {
    service.validateAndConsumeKey.mockResolvedValue({
      organizationId: 'org-test',
      keyId: 'key-test',
      quotaUsed: 1,
      quotaRemaining: 9999,
    });

    const context = createMockContext({ authorization: 'Bearer mgp_live_bearer123' });
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(service.validateAndConsumeKey).toHaveBeenCalledWith(
      'mgp_live_bearer123',
      'aso:read',
    );
  });

  it('deve lançar UnauthorizedException se nenhum cabeçalho for informado', async () => {
    const context = createMockContext({});
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});
