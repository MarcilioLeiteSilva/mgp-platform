import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { PasswordService } from '../modules/auth/password.service';
import { AuthService } from '../modules/auth/auth.service';
import { AuthController } from '../modules/auth/auth.controller';
import { OrganizationsService } from '../modules/organizations/organizations.service';
import { OrganizationsController } from '../modules/organizations/organizations.controller';
import { InvitationsController } from '../modules/organizations/invitations.controller';
import { AppsService } from '../modules/apps/apps.service';
import { AppsController } from '../modules/apps/apps.controller';
import { AdminService } from '../modules/admin/admin.service';
import { AdminController } from '../modules/admin/admin.controller';
import { TenantGuard } from '../common/guards/tenant.guard';
import { SuperadminGuard } from '../common/guards/superadmin.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole, WalletAccountType, InvitationStatus } from '@mgp/database';
import { Reflector } from '@nestjs/core';

describe('Suíte de Testes Ponta a Ponta (E2E) e Integração — Etapa 1', () => {
  let authService: AuthService;
  let authController: AuthController;
  let orgService: OrganizationsService;
  let orgController: OrganizationsController;
  let invController: InvitationsController;
  let appsService: AppsService;
  let appsController: AppsController;
  let adminService: AdminService;
  let adminController: AdminController;
  let tenantGuard: TenantGuard;
  let superadminGuard: SuperadminGuard;
  let passwordService: PasswordService;
  let jwtService: JwtService;

  // Mock centralizado do Prisma com suporte a transações ACID
  const mockPrisma: Record<string, any> = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    membership: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organizationInvitation: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    wallet: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    walletAccount: {
      create: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    app: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn((callback: any) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      return Promise.all(callback);
    }),
  };

  const mockAppConfig = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'JWT_ACCESS_SECRET':
          return 'test-access-secret-key-32-chars-long';
        case 'JWT_ACCESS_EXPIRES_IN':
          return '15m';
        case 'JWT_REFRESH_SECRET':
          return 'test-refresh-secret-key-32-chars-long';
        case 'JWT_REFRESH_EXPIRES_IN':
          return '7d';
        default:
          return 'mock-val';
      }
    }),
    jwtAccessSecret: 'test-access-secret-key-32-chars-long',
    jwtAccessExpiresIn: '15m',
    jwtRefreshSecret: 'test-refresh-secret-key-32-chars-long',
    jwtRefreshExpiresIn: '7d',
    isProduction: false,
    isDevelopment: true,
  };

  const createMockExecutionContext = (
    user: any,
    headers: Record<string, string> = {},
    params: Record<string, string> = {},
    query: Record<string, string> = {},
  ): ExecutionContext => {
    const req: any = {
      user,
      headers,
      params,
      query,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [
        AuthController,
        OrganizationsController,
        InvitationsController,
        AppsController,
        AdminController,
      ],
      providers: [
        AuthService,
        OrganizationsService,
        AppsService,
        AdminService,
        PasswordService,
        TenantGuard,
        SuperadminGuard,
        RolesGuard,
        Reflector,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AppConfigService,
          useValue: mockAppConfig,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked.jwt.token'),
            signAsync: jest.fn().mockResolvedValue('mocked.jwt.token'),
            verify: jest.fn().mockReturnValue({ sub: 'usr_active_1', email: 'dev@mgp.com', type: 'refresh' }),
            verifyAsync: jest.fn().mockResolvedValue({ sub: 'usr_active_1', email: 'dev@mgp.com', type: 'refresh' }),
          },
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
    authController = moduleRef.get<AuthController>(AuthController);
    orgService = moduleRef.get<OrganizationsService>(OrganizationsService);
    orgController = moduleRef.get<OrganizationsController>(OrganizationsController);
    invController = moduleRef.get<InvitationsController>(InvitationsController);
    appsService = moduleRef.get<AppsService>(AppsService);
    appsController = moduleRef.get<AppsController>(AppsController);
    adminService = moduleRef.get<AdminService>(AdminService);
    adminController = moduleRef.get<AdminController>(AdminController);
    tenantGuard = moduleRef.get<TenantGuard>(TenantGuard);
    superadminGuard = moduleRef.get<SuperadminGuard>(SuperadminGuard);
    passwordService = moduleRef.get<PasswordService>(PasswordService);
    jwtService = moduleRef.get<JwtService>(JwtService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. FLUXO DE AUTENTICAÇÃO, TOKENS E DETECÇÃO DE ROUBO DE SESSÃO
  // =========================================================================
  describe('1. Fluxo de Autenticação, Ciclo de Vida de Tokens e Rotação de Sessão', () => {
    it('1.1 deve registrar um novo usuário com transação atômica criando User, Tenant, Membresia OWNER, Carteira Multicontas e Sessão', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      const createdUser = {
        id: 'usr_new_1',
        email: 'novo@empresa.com',
        fullName: 'Fundador MGP',
        isActive: true,
        isSuperadmin: false,
      };

      const createdOrg = {
        id: 'org_new_1',
        name: 'Empresa Alpha',
        slug: 'empresa-alpha',
      };

      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockPrisma.organization.create.mockResolvedValue(createdOrg);
      mockPrisma.membership.create.mockResolvedValue({ id: 'mem_1', role: UserRole.OWNER });
      mockPrisma.wallet.create.mockResolvedValue({ id: 'wal_1', organizationId: createdOrg.id });
      mockPrisma.walletAccount.create.mockResolvedValue({ id: 'acc_1' });
      mockPrisma.session.create.mockResolvedValue({ id: 'sess_1' });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'aud_1' });

      const result = await authService.register({
        email: 'novo@empresa.com',
        password: 'Password123!',
        fullName: 'Fundador MGP',
        organizationName: 'Empresa Alpha',
      });

      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('novo@empresa.com');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // Garante criação das 3 contas contábeis segregadas
      expect(mockPrisma.walletAccount.create).toHaveBeenCalledTimes(3);
    });

    it('1.2 deve autenticar credenciais válidas e emitir par de tokens com sessão ativa', async () => {
      const hashedPassword = await passwordService.hash('Secret123!');
      const mockUser = {
        id: 'usr_active_1',
        email: 'ativo@mgp.com',
        passwordHash: hashedPassword,
        fullName: 'Usuário Ativo',
        isActive: true,
        isSuperadmin: false,
        memberships: [
          {
            organizationId: 'org_default',
            role: UserRole.OWNER,
            organization: { id: 'org_default', name: 'Org Default' },
          },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.session.create.mockResolvedValue({ id: 'sess_login_1' });

      const loginResult = await authService.login({
        email: 'ativo@mgp.com',
        password: 'Secret123!',
      });

      expect(loginResult.tokens).toHaveProperty('accessToken');
      expect(loginResult.tokens).toHaveProperty('refreshToken');
      expect(loginResult.user.id).toBe('usr_active_1');
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    it('1.3 deve renovar par de tokens aplicando rotação atômica de refresh token', async () => {
      const activeSession = {
        id: 'sess_rotate_1',
        userId: 'usr_active_1',
        refreshTokenHash: 'sha256_mock_hash',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        user: {
          id: 'usr_active_1',
          isActive: true,
          isSuperadmin: false,
          memberships: [
            {
              organizationId: 'org_alpha',
              role: UserRole.OWNER,
              isDefault: true,
              organization: { id: 'org_alpha', name: 'Org Alpha' },
            },
          ],
        },
      };

      mockPrisma.session.findUnique.mockResolvedValue(activeSession);
      mockPrisma.session.update.mockResolvedValue({ ...activeSession, refreshTokenHash: 'new_hash' });

      const refreshResult = await authService.refreshToken('valid.refresh.token');

      expect(refreshResult.tokens).toHaveProperty('accessToken');
      expect(refreshResult.tokens).toHaveProperty('refreshToken');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'sess_rotate_1' },
        data: { isRevoked: true },
      });
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });

    it('1.4 deve detectar tentativa de reuso de token revogado (Theft Detection) e revogar em lote todas as sessões do usuário', async () => {
      const revokedSession = {
        id: 'sess_compromised_1',
        userId: 'usr_victim_1',
        refreshTokenHash: 'old_compromised_hash',
        isRevoked: true, // Já revogado / rotacionado
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        user: { id: 'usr_victim_1', isActive: true, isSuperadmin: false },
      };

      mockPrisma.session.findUnique.mockResolvedValue(revokedSession);

      // Reuso do token revogado deve disparar alarme antifraude e lançar UnauthorizedException
      await expect(authService.refreshToken('reused.stolen.token')).rejects.toThrow(UnauthorizedException);

      // Verificação do mecanismo de segurança: todas as sessões do usuário são revogadas
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr_victim_1' },
        data: { isRevoked: true },
      });
    });

    it('1.5 deve revogar sessão atual no logout', async () => {
      mockPrisma.session.updateMany.mockResolvedValue({ count: 1 });
      const logoutResponse = await authService.logout('valid.refresh.token');

      expect(logoutResponse.message).toContain('sucesso');
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isRevoked: true },
        }),
      );
    });
  });

  // =========================================================================
  // 2. ISOLAMENTO MULTI-TENANT E ZERO DATA LEAKAGE
  // =========================================================================
  describe('2. Isolamento Multi-Tenant e Garantia de Zero Data Leakage', () => {
    it('2.1 TenantGuard deve bloquear com ForbiddenException requisições sem usuário autenticado', async () => {
      const ctx = createMockExecutionContext(null);
      await expect(tenantGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('2.2 TenantGuard deve rejeitar com 403 Forbidden tentativa de acessar tenant alheio sem membresia ativa', async () => {
      const user = { id: 'usr_intruder', isSuperadmin: false };
      const ctx = createMockExecutionContext(user, { 'x-organization-id': 'org_victim_secrets' });

      // O usuário não possui membresia nesta organização
      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(tenantGuard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    });

    it('2.3 TenantGuard deve autorizar acesso a organização onde o usuário possui membresia válida e injetar o tenant context', async () => {
      const user = { id: 'usr_legit', isSuperadmin: false };
      const ctx = createMockExecutionContext(user, { 'x-organization-id': 'org_legit_1' });

      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'mem_legit',
        userId: 'usr_legit',
        organizationId: 'org_legit_1',
        role: UserRole.ADMIN,
      });

      const allowed = await tenantGuard.canActivate(ctx);
      expect(allowed).toBe(true);

      const req: any = ctx.switchToHttp().getRequest();
      expect(req.tenant).toEqual({
        organizationId: 'org_legit_1',
        role: UserRole.ADMIN,
        userId: 'usr_legit',
        isSuperadmin: false,
      });
    });

    it('2.4 AppsService.listApps deve filtrar aplicativos estritamente pela organizationId da organização ativa', async () => {
      mockPrisma.app.findMany.mockResolvedValue([
        { id: 'app_1', name: 'Jogo Alpha', organizationId: 'org_alpha' },
      ]);

      const apps = await appsService.listApps('org_alpha');

      expect(apps).toHaveLength(1);
      expect(mockPrisma.app.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org_alpha' },
        }),
      );
    });

    it('2.5 AppsService.findAppById deve retornar NotFoundException ao tentar acessar app de outro tenant (Zero Data Leakage)', async () => {
      // Tentativa de consultar app_alpha informando organizationId = org_beta
      mockPrisma.app.findFirst.mockResolvedValue(null);

      await expect(appsService.findAppById('app_alpha', 'org_beta')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.app.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'app_alpha',
            organizationId: 'org_beta',
          },
        }),
      );
    });
  });

  // =========================================================================
  // 3. RBAC, SALVAGUARDAS DE ORPHAN E TRANSFERÊNCIA DE POSSE
  // =========================================================================
  describe('3. Governança RBAC, Salvaguardas de Tenant e Transferência Atômica de Posse', () => {
    it('3.1 deve bloquear remoção do único OWNER da organização (Salvaguarda de Tenant)', async () => {
      // Organização com apenas 1 OWNER
      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'mem_owner_only',
        userId: 'usr_owner_1',
        role: UserRole.OWNER,
        organizationId: 'org_alpha',
      });
      mockPrisma.membership.count.mockResolvedValue(1);

      await expect(
        orgService.removeMember('org_alpha', 'usr_owner_1', 'usr_owner_1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('3.2 deve transferir posse de forma atômica (novo OWNER e rebaixamento do anterior a ADMIN)', async () => {
      const currentOwnerMember = {
        id: 'mem_owner',
        userId: 'usr_current_owner',
        role: UserRole.OWNER,
        organizationId: 'org_target',
      };
      const candidateMember = {
        id: 'mem_candidate',
        userId: 'usr_successor',
        role: UserRole.ADMIN,
        organizationId: 'org_target',
      };

      mockPrisma.membership.findUnique.mockResolvedValueOnce(currentOwnerMember);
      mockPrisma.membership.findFirst.mockResolvedValueOnce(candidateMember);

      mockPrisma.membership.update
        .mockResolvedValueOnce({ ...candidateMember, role: UserRole.OWNER })
        .mockResolvedValueOnce({ ...currentOwnerMember, role: UserRole.ADMIN });

      mockPrisma.auditLog.create.mockResolvedValue({ id: 'aud_transfer' });

      const result = await orgService.transferOwnership(
        'org_target',
        'usr_current_owner',
        { newOwnerUserId: 'usr_successor' },
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_organizationId: {
              organizationId: 'org_target',
              userId: 'usr_successor',
            },
          },
          data: { role: UserRole.OWNER },
        }),
      );
      expect(mockPrisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_organizationId: {
              organizationId: 'org_target',
              userId: 'usr_current_owner',
            },
          },
          data: { role: UserRole.ADMIN },
        }),
      );
    });
  });

  // =========================================================================
  // 4. CICLO DE VIDA DE CONVITES CRIPTOGRÁFICOS
  // =========================================================================
  describe('4. Ciclo de Vida de Convites Criptográficos para Organizações', () => {
    it('4.1 deve gerar convite com token criptográfico de 64 caracteres e expiração de 7 dias', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_invited',
        email: 'guest@empresa.com',
        memberships: [],
      });
      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.organizationInvitation.findFirst.mockResolvedValue(null);

      mockPrisma.organizationInvitation.create.mockImplementation((args: any) => {
        return Promise.resolve({
          id: 'inv_1',
          ...args.data,
          organization: { name: 'Empresa Alpha' },
        });
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'aud_inv' });

      const invitation = await orgService.createInvitation(
        'org_alpha',
        'usr_owner_1',
        { email: 'guest@empresa.com', role: UserRole.DEVELOPER },
      );

      expect(invitation).toHaveProperty('token');
      expect(invitation.token.length).toBe(64);
      expect(invitation.status).toBe(InvitationStatus.PENDING);
    });

    it('4.2 deve permitir consulta pública de convite válido sem vazar dados sensíveis', async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: 'inv_1',
        token: 'a'.repeat(64),
        status: InvitationStatus.PENDING,
        email: 'guest@empresa.com',
        role: UserRole.DEVELOPER,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
        organization: { id: 'org_alpha', name: 'Empresa Alpha', slug: 'empresa-alpha' },
        invitedBy: { fullName: 'Fundador MGP' },
      });

      const publicInfo = await invController.getInvitation('a'.repeat(64));

      expect(publicInfo.organization.name).toBe('Empresa Alpha');
      expect(publicInfo.role).toBe(UserRole.DEVELOPER);
      expect(publicInfo.invitedBy.fullName).toBe('Fundador MGP');
    });

    it('4.3 deve aceitar convite de forma atômica criando membresia e marcando token como ACCEPTED', async () => {
      const validInvitation = {
        id: 'inv_to_accept',
        token: 'b'.repeat(64),
        status: InvitationStatus.PENDING,
        email: 'guest@empresa.com',
        role: UserRole.DEVELOPER,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 5),
        organizationId: 'org_alpha',
      };

      mockPrisma.organizationInvitation.findUnique.mockResolvedValue(validInvitation);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'usr_guest', email: 'guest@empresa.com' });
      mockPrisma.membership.findUnique.mockResolvedValue(null);
      mockPrisma.membership.findFirst.mockResolvedValue(null);
      mockPrisma.membership.create.mockResolvedValue({ id: 'mem_new_guest' });
      mockPrisma.organizationInvitation.update.mockResolvedValue({
        ...validInvitation,
        status: InvitationStatus.ACCEPTED,
      });

      const acceptResult = await invController.acceptInvitation('b'.repeat(64), { user: { id: 'usr_guest' } });

      expect(acceptResult.success).toBe(true);
      expect(mockPrisma.organizationInvitation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv_to_accept' },
          data: expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
        }),
      );
      expect(mockPrisma.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'usr_guest',
            organizationId: 'org_alpha',
            role: UserRole.DEVELOPER,
          }),
        }),
      );
    });
  });

  // =========================================================================
  // 5. SEGREGAÇÃO CONTÁBIL DA CARTEIRA (LEDGER MULTICONTAS)
  // =========================================================================
  describe('5. Segregação Contábil da Carteira (Ledger Financeiro Multicontas)', () => {
    it('5.1 deve provisionar exatamente 3 contas contábeis segregadas por carteira', async () => {
      mockPrisma.organization.create.mockResolvedValue({ id: 'org_fin', name: 'Org Fin', slug: 'org-fin' });
      mockPrisma.membership.create.mockResolvedValue({ id: 'mem_fin' });
      mockPrisma.wallet.create.mockResolvedValue({ id: 'wal_fin', organizationId: 'org_fin' });
      mockPrisma.walletAccount.create.mockImplementation((args: any) => Promise.resolve({ id: `acc_${args.data.type}` }));
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'aud_fin' });

      await orgService.createOrganization(
        'usr_creator',
        { name: 'Org Fin', slug: 'org-fin' },
      );

      // Verificação estrita de segregação contábil
      expect(mockPrisma.walletAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: WalletAccountType.ADVERTISING_CREDITS }),
        }),
      );
      expect(mockPrisma.walletAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: WalletAccountType.EXCHANGE_CREDITS }),
        }),
      );
      expect(mockPrisma.walletAccount.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: WalletAccountType.PUBLISHER_EARNINGS }),
        }),
      );
    });
  });

  // =========================================================================
  // 6. PAINEL SUPERADMIN, TELEMETRIA NOC E MODERAÇÃO
  // =========================================================================
  describe('6. Segurança e Operação Central do Backoffice NOC (Superadmin)', () => {
    it('6.1 SuperadminGuard deve bloquear usuários convencionais com 403 Forbidden', () => {
      const nonAdminUser = { id: 'usr_regular', isSuperadmin: false };
      const ctx = createMockExecutionContext(nonAdminUser);

      expect(() => superadminGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('6.2 SuperadminGuard deve permitir acesso exclusivo de superadministradores', () => {
      const superUser = { id: 'usr_super_root', isSuperadmin: true };
      const ctx = createMockExecutionContext(superUser);

      expect(superadminGuard.canActivate(ctx)).toBe(true);
    });

    it('6.3 deve fornecer visão operacional global com contadores e latência', async () => {
      mockPrisma.organization.count.mockResolvedValue(15);
      mockPrisma.user.count.mockResolvedValue(42);
      mockPrisma.app.count.mockResolvedValue(30);
      mockPrisma.session.count.mockResolvedValue(8);
      mockPrisma.auditLog.count.mockResolvedValue(100);
      mockPrisma.walletAccount.findMany.mockResolvedValue([
        { type: WalletAccountType.ADVERTISING_CREDITS, cachedBalance: 500000 },
        { type: WalletAccountType.EXCHANGE_CREDITS, cachedBalance: 250000 },
        { type: WalletAccountType.PUBLISHER_EARNINGS, cachedBalance: 500000 },
      ]);
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const overview = await adminService.getSystemOverview();

      expect(overview.kpis.organizationsCount).toBe(15);
      expect(overview.kpis.usersCount).toBe(42);
      expect(overview.kpis.activeSessionsCount).toBe(8);
      expect(overview.status).toBe('OPERATIONAL');
      expect(overview.infrastructure.database.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('6.4 ao desativar usuário via Backoffice, deve revogar imediatamente todas as suas sessões ativas', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_bad_actor',
        email: 'bad@mgp.com',
        isActive: true,
        isSuperadmin: false,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'usr_bad_actor',
        fullName: 'Bad Actor',
        email: 'bad@mgp.com',
        isActive: false,
        isSuperadmin: false,
        updatedAt: new Date(),
      });
      mockPrisma.session.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'aud_susp' });

      const updated = await adminService.updateUserStatus(
        'usr_bad_actor',
        { isActive: false },
        'usr_super_operator',
      );

      expect(updated.isActive).toBe(false);
      // Confirmação de revogação de todas as sessões do usuário desativado
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr_bad_actor' },
        data: { isRevoked: true },
      });
    });

    it('6.5 deve expor telemetria do sistema no formato aberto Prometheus (/admin/metrics)', async () => {
      mockPrisma.organization.count.mockResolvedValue(15);
      mockPrisma.user.count.mockResolvedValue(42);
      mockPrisma.app.count.mockResolvedValue(30);
      mockPrisma.session.count.mockResolvedValue(8);
      mockPrisma.auditLog.count.mockResolvedValue(100);
      mockPrisma.walletAccount.findMany.mockResolvedValue([]);
      mockPrisma.$queryRaw.mockResolvedValue([{ 1: 1 }]);

      const metrics = await adminService.getPrometheusMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('mgp_organizations_total');
      expect(metrics).toContain('mgp_users_total');
      expect(metrics).toContain('mgp_active_sessions_total');
      expect(metrics).toContain('mgp_db_latency_ms');
    });
  });
});
