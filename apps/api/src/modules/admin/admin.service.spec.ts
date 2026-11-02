import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { AppStatus, WalletAccountType } from '@mgp/database';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;

  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    organization: {
      count: jest.fn().mockResolvedValue(5),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'org-1',
          name: 'Org Test',
          slug: 'org-test',
          _count: { memberships: 2, apps: 1, campaigns: 0 },
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'org-1',
        name: 'Org Test',
        planTier: 'FREE',
        isVerified: false,
      }),
      update: jest.fn().mockImplementation(({ where, data }) => ({
        id: where.id,
        name: 'Org Test',
        ...data,
      })),
    },
    user: {
      count: jest.fn().mockResolvedValue(10),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'user-1',
          email: 'admin@mgp.com',
          fullName: 'Super Admin',
          isActive: true,
          isSuperadmin: true,
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@mgp.com',
        isActive: true,
        isSuperadmin: false,
      }),
      update: jest.fn().mockImplementation(({ where, data }) => ({
        id: where.id,
        ...data,
      })),
    },
    app: {
      count: jest.fn().mockResolvedValue(8),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'app-1',
          name: 'App Test',
          packageName: 'com.test.app',
          status: AppStatus.ACTIVE,
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'app-1',
        name: 'App Test',
        organizationId: 'org-1',
        status: AppStatus.PENDING,
      }),
      update: jest.fn().mockImplementation(({ where, data }) => ({
        id: where.id,
        ...data,
      })),
    },
    session: {
      count: jest.fn().mockResolvedValue(3),
      updateMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
    auditLog: {
      count: jest.fn().mockResolvedValue(42),
      create: jest.fn().mockResolvedValue({ id: 'log-1' }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'log-1',
          action: 'USER_REGISTERED',
          createdAt: new Date(),
        },
      ]),
    },
    walletAccount: {
      findMany: jest.fn().mockResolvedValue([
        { type: WalletAccountType.ADVERTISING_CREDITS, cachedBalance: 500.0 },
        { type: WalletAccountType.EXCHANGE_CREDITS, cachedBalance: 250.0 },
        { type: WalletAccountType.PUBLISHER_EARNINGS, cachedBalance: 120.0 },
      ]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('getSystemOverview', () => {
    it('deve retornar métricas e KPIs consolidados de infraestrutura e negócio', async () => {
      const overview = await service.getSystemOverview();

      expect(overview.status).toBe('OPERATIONAL');
      expect(overview.infrastructure.database.status).toBe('ONLINE');
      expect(overview.kpis.organizationsCount).toBe(5);
      expect(overview.kpis.usersCount).toBe(10);
      expect(overview.kpis.appsCount).toBe(8);
      expect(overview.kpis.activeSessionsCount).toBe(3);
      expect(overview.kpis.custodyBalances.advertisingCredits).toBe(500);
      expect(overview.kpis.custodyBalances.exchangeCredits).toBe(250);
      expect(overview.kpis.custodyBalances.publisherEarnings).toBe(120);
    });
  });

  describe('listOrganizations', () => {
    it('deve listar organizações da plataforma', async () => {
      const orgs = await service.listOrganizations();
      expect(Array.isArray(orgs)).toBe(true);
      expect(orgs.length).toBe(1);
    });
  });

  describe('updateOrganizationStatus', () => {
    it('deve atualizar o plano e verificação da organização e registrar auditoria', async () => {
      const updated = await service.updateOrganizationStatus(
        'org-1',
        { planTier: 'ENTERPRISE', isVerified: true },
        'admin-operator',
      );

      expect(updated.planTier).toBe('ENTERPRISE');
      expect(updated.isVerified).toBe(true);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException se a organização não existir', async () => {
      mockPrisma.organization.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.updateOrganizationStatus('inexistente', { planTier: 'PRO' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUserStatus', () => {
    it('deve suspender usuário e revogar todas as sessões ativas', async () => {
      const updated = await service.updateUserStatus('user-1', { isActive: false }, 'operator-id');

      expect(updated.isActive).toBe(false);
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        data: { isRevoked: true },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('deve impedir que o superadmin desative a si próprio', async () => {
      await expect(
        service.updateUserStatus('operator-id', { isActive: false }, 'operator-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateAppStatus', () => {
    it('deve alterar status do aplicativo e registrar auditoria', async () => {
      const updated = await service.updateAppStatus(
        'app-1',
        { status: AppStatus.ACTIVE },
        'operator-id',
      );

      expect(updated.status).toBe(AppStatus.ACTIVE);
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('getAuditLogs', () => {
    it('deve retornar logs de auditoria com paginação', async () => {
      const res = await service.getAuditLogs({ page: 1, limit: 10 });
      expect(res.pagination.total).toBe(42);
      expect(res.pagination.totalPages).toBe(5);
      expect(res.items.length).toBe(1);
    });
  });

  describe('getQueuesStatus', () => {
    it('deve retornar o status operacional das filas', async () => {
      const status = await service.getQueuesStatus();
      expect(Array.isArray(status.queues)).toBe(true);
      expect(status.queues.length).toBe(4);
      expect(status.queues[0].name).toBe('queue-telemetry');
    });
  });

  describe('getPrometheusMetrics', () => {
    it('deve retornar métricas em formato texto puro para o Prometheus', async () => {
      const metrics = await service.getPrometheusMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('mgp_uptime_seconds');
      expect(metrics).toContain('mgp_organizations_total');
      expect(metrics).toContain('mgp_users_total');
      expect(metrics).toContain('mgp_apps_total');
    });
  });
});
