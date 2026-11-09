import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '../../../database/prisma.service';

describe('ApiKeysService (Gestão de API Keys Comerciais & Rate Limiting)', () => {
  let service: ApiKeysService;
  let prisma: any;

  const mockApiKey = {
    id: 'key-uuid-1',
    organizationId: 'org-1',
    name: 'Integração Agência',
    keyPrefix: 'mgp_live_12345678',
    keyHash: 'hash-sha256-1',
    scopes: ['aso:read', 'estimates:read', 'trends:read'],
    rateLimitPerMin: 60,
    quotaMonthly: 10000,
    quotaUsed: 150,
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      apiKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  describe('createApiKey', () => {
    it('deve gerar chave de API com prefixo mgp_live_ e armazenar apenas hash SHA-256 no banco', async () => {
      prisma.apiKey.create.mockImplementation((args: any) => ({
        id: 'new-key-1',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.createApiKey('org-1', {
        name: 'Dashboard BI',
        expiresInDays: 30,
      });

      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
            name: 'Dashboard BI',
            keyPrefix: expect.stringMatching(/^mgp_live_[a-f0-9]{8}$/),
            keyHash: expect.any(String),
            quotaMonthly: 10000,
          }),
        }),
      );
      expect(result.plainTextKey).toMatch(/^mgp_live_[a-f0-9]{48}$/);
      expect(result.apiKey.keyPrefix).toMatch(/^mgp_live_[a-f0-9]{8}$/);
      expect(result.apiKey.name).toBe('Dashboard BI');
    });
  });

  describe('listKeys', () => {
    it('deve listar as chaves de API da organização ordenadas por criação', async () => {
      prisma.apiKey.findMany.mockResolvedValue([mockApiKey]);

      const result = await service.listKeys('org-1');

      expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('key-uuid-1');
      expect(result[0].isRevoked).toBe(false);
    });
  });

  describe('revokeKey', () => {
    it('deve revogar chave de API marcando revokedAt', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(mockApiKey);
      prisma.apiKey.update.mockResolvedValue({
        ...mockApiKey,
        revokedAt: new Date(),
      });

      const result = await service.revokeKey('key-uuid-1', 'org-1');

      expect(prisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key-uuid-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.isRevoked).toBe(true);
    });

    it('deve lançar NotFoundException se a chave não pertencer à organização', async () => {
      prisma.apiKey.findFirst.mockResolvedValue(null);

      await expect(service.revokeKey('invalid-id', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('deve consolidar quotas e contagem de chaves ativas e revogadas', async () => {
      prisma.apiKey.findMany.mockResolvedValue([
        mockApiKey,
        {
          ...mockApiKey,
          id: 'key-revoked-2',
          quotaMonthly: 5000,
          quotaUsed: 5000,
          revokedAt: new Date(),
        },
      ]);

      const stats = await service.getStats('org-1');

      expect(stats.totalKeys).toBe(2);
      expect(stats.activeKeys).toBe(1);
      expect(stats.revokedKeys).toBe(1);
      expect(stats.monthlyQuota).toBe(15000);
      expect(stats.monthlyUsed).toBe(5150);
      expect(stats.remainingQuota).toBe(9850);
    });
  });

  describe('validateAndConsumeKey', () => {
    const plainSecret = 'mgp_live_0123456789abcdef0123456789abcdef0123456789abcdef';

    it('deve lançar UnauthorizedException se chave não iniciar com mgp_live_', async () => {
      await expect(
        service.validateAndConsumeKey('chave_invalida'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se chave for revogada', async () => {
      const hash = service.hashKey(plainSecret);
      prisma.apiKey.findUnique.mockResolvedValue({
        ...mockApiKey,
        keyHash: hash,
        revokedAt: new Date(),
      });

      await expect(service.validateAndConsumeKey(plainSecret)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar UnauthorizedException se chave estiver expirada', async () => {
      const hash = service.hashKey(plainSecret);
      prisma.apiKey.findUnique.mockResolvedValue({
        ...mockApiKey,
        keyHash: hash,
        expiresAt: new Date(Date.now() - 10000), // Expirada no passado
      });

      await expect(service.validateAndConsumeKey(plainSecret)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('deve lançar ForbiddenException se chave não possuir o escopo solicitado', async () => {
      const hash = service.hashKey(plainSecret);
      prisma.apiKey.findUnique.mockResolvedValue({
        ...mockApiKey,
        keyHash: hash,
        scopes: ['aso:read'],
      });

      await expect(
        service.validateAndConsumeKey(plainSecret, 'estimates:read'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve lançar 429 TooManyRequests se a quota mensal foi esgotada', async () => {
      const hash = service.hashKey(plainSecret);
      prisma.apiKey.findUnique.mockResolvedValue({
        ...mockApiKey,
        keyHash: hash,
        quotaMonthly: 10000,
        quotaUsed: 10000,
      });

      await expect(
        service.validateAndConsumeKey(plainSecret, 'aso:read'),
      ).rejects.toThrow(HttpException);
    });

    it('deve autenticar e incrementar quota de uso com sucesso', async () => {
      const hash = service.hashKey(plainSecret);
      prisma.apiKey.findUnique.mockResolvedValue({
        ...mockApiKey,
        keyHash: hash,
        quotaMonthly: 10000,
        quotaUsed: 200,
      });
      prisma.apiKey.update.mockResolvedValue({
        ...mockApiKey,
        quotaMonthly: 10000,
        quotaUsed: 201,
      });

      const auth = await service.validateAndConsumeKey(plainSecret, 'aso:read');

      expect(auth.organizationId).toBe('org-1');
      expect(auth.quotaUsed).toBe(201);
      expect(auth.quotaRemaining).toBe(9799);
      expect(prisma.apiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockApiKey.id },
          data: expect.objectContaining({ quotaUsed: { increment: 1 } }),
        }),
      );
    });
  });
});
