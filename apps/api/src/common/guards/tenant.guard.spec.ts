import { Test, TestingModule } from '@nestjs/testing';
import { TenantGuard } from './tenant.guard';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException, BadRequestException, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@mgp/database';

describe('TenantGuard (Isolamento Multi-Tenant)', () => {
  let guard: TenantGuard;
  let prisma: PrismaService;

  const mockPrisma = {
    membership: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const createMockContext = (
    user: any,
    headers: Record<string, string> = {},
    query: Record<string, string> = {},
  ): ExecutionContext => {
    const req: any = {
      user,
      headers,
      query,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(guard).toBeDefined();
  });

  it('deve lançar ForbiddenException se não houver usuário autenticado', async () => {
    const ctx = createMockContext(null);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('deve permitir acesso direto se o usuário for superadmin global', async () => {
    const user = { id: 'usr_super', isSuperadmin: true };
    const ctx = createMockContext(user, { 'x-organization-id': 'org_target' });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx.switchToHttp().getRequest();
    expect(req.tenant).toEqual({
      organizationId: 'org_target',
      role: UserRole.OWNER,
      userId: 'usr_super',
      isSuperadmin: true,
    });
  });

  it('deve lançar ForbiddenException se o usuário não possuir membresia na organização solicitada', async () => {
    const user = { id: 'usr_user1', isSuperadmin: false };
    const ctx = createMockContext(user, { 'x-organization-id': 'org_alien' });

    mockPrisma.membership.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.membership.findUnique).toHaveBeenCalledWith({
      where: {
        userId_organizationId: {
          userId: 'usr_user1',
          organizationId: 'org_alien',
        },
      },
    });
  });

  it('deve anexar request.tenant se o usuário for membro regular da organização', async () => {
    const user = { id: 'usr_user1', isSuperadmin: false };
    const ctx = createMockContext(user, { 'x-organization-id': 'org_valid' });

    mockPrisma.membership.findUnique.mockResolvedValue({
      id: 'mem_1',
      userId: 'usr_user1',
      organizationId: 'org_valid',
      role: UserRole.DEVELOPER,
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx.switchToHttp().getRequest();
    expect(req.tenant).toEqual({
      organizationId: 'org_valid',
      role: UserRole.DEVELOPER,
      userId: 'usr_user1',
      isSuperadmin: false,
    });
  });

  it('deve buscar organização padrão caso x-organization-id não seja informado', async () => {
    const user = { id: 'usr_user1', isSuperadmin: false };
    const ctx = createMockContext(user, {});

    mockPrisma.membership.findFirst.mockResolvedValue({
      id: 'mem_default',
      userId: 'usr_user1',
      organizationId: 'org_default',
      role: UserRole.ADMIN,
      isDefault: true,
    });

    mockPrisma.membership.findUnique.mockResolvedValue({
      id: 'mem_default',
      userId: 'usr_user1',
      organizationId: 'org_default',
      role: UserRole.ADMIN,
    });

    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);

    const req = ctx.switchToHttp().getRequest();
    expect(req.tenant.organizationId).toBe('org_default');
  });

  it('deve lançar BadRequestException se x-organization-id for omitido e o usuário não tiver organizações', async () => {
    const user = { id: 'usr_user1', isSuperadmin: false };
    const ctx = createMockContext(user, {});

    mockPrisma.membership.findFirst.mockResolvedValue(null);

    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });
});

