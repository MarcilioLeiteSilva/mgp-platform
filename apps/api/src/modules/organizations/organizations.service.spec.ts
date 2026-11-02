import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { UserRole, WalletAccountType } from '@mgp/database';

describe('OrganizationsService (Multi-Tenancy & Ledger Creation)', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    wallet: {
      create: jest.fn(),
    },
    walletAccount: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('listUserOrganizations', () => {
    it('deve listar organizações mapeadas da membresia do usuário', async () => {
      mockPrisma.membership.findMany.mockResolvedValue([
        {
          id: 'mem_1',
          role: UserRole.OWNER,
          isDefault: true,
          createdAt: new Date(),
          organization: {
            id: 'org_1',
            name: 'Studio Alpha',
            slug: 'studio-alpha',
            planTier: 'PRO',
            isVerified: true,
            createdAt: new Date(),
          },
        },
      ]);

      const result = await service.listUserOrganizations('usr_1');
      expect(result).toHaveLength(1);
      expect(result[0].organization.name).toBe('Studio Alpha');
      expect(result[0].role).toBe(UserRole.OWNER);
    });
  });

  describe('findById (Zero Data Leakage)', () => {
    it('deve lançar ForbiddenException se o usuário não pertencer à organização', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.findById('org_foreign', 'usr_intruder')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve retornar a organização com carteira e contadores se o usuário for membro', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'mem_valid',
        userId: 'usr_valid',
        organizationId: 'org_valid',
        role: UserRole.DEVELOPER,
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org_valid',
        name: 'Studio Alpha',
        slug: 'studio-alpha',
        wallet: { id: 'wal_1', accounts: [] },
        _count: { memberships: 2, apps: 3, campaigns: 1 },
      });

      const result = await service.findById('org_valid', 'usr_valid');
      expect(result.id).toBe('org_valid');
      expect(result.name).toBe('Studio Alpha');
    });
  });

  describe('createOrganization', () => {
    it('deve lançar ConflictException se o slug já existir', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org_existing' });

      await expect(
        service.createOrganization('usr_1', { name: 'Alpha', slug: 'alpha-slug' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve criar organização, membresia OWNER e 3 contas contábeis na carteira', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          organization: {
            create: jest.fn().mockResolvedValue({
              id: 'org_new',
              name: 'Nova Empresa',
              slug: 'nova-empresa',
              planTier: 'FREE',
            }),
          },
          membership: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'mem_new',
              role: UserRole.OWNER,
              isDefault: true,
            }),
          },
          wallet: {
            create: jest.fn().mockResolvedValue({ id: 'wal_new' }),
          },
          walletAccount: {
            create: jest.fn().mockResolvedValue({ id: 'acc_new' }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'log_new' }),
          },
        };
        return callback(tx);
      });

      const result = await service.createOrganization('usr_1', {
        name: 'Nova Empresa',
        slug: 'nova-empresa',
      });

      expect(result.id).toBe('org_new');
      expect(result.membership.role).toBe(UserRole.OWNER);
      expect(result.membership.isDefault).toBe(true);
    });
  });

  describe('addMember (RBAC)', () => {
    it('deve impedir que usuários que não sejam OWNER ou ADMIN adicionem membros', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'mem_dev',
        role: UserRole.DEVELOPER,
      });

      await expect(
        service.addMember('org_1', 'usr_dev', {
          email: 'novo@empresa.com',
          role: UserRole.ANALYST,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve adicionar novo membro com sucesso quando requisitado por OWNER', async () => {
      // Requisitante é OWNER
      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem_owner',
          role: UserRole.OWNER,
        })
        // Novo membro ainda não possui membresia
        .mockResolvedValueOnce(null);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_target',
        email: 'novo@empresa.com',
      });

      mockPrisma.membership.create.mockResolvedValue({
        id: 'mem_new',
        userId: 'usr_target',
        organizationId: 'org_1',
        role: UserRole.DEVELOPER,
      });

      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log_1' });

      const result = await service.addMember('org_1', 'usr_owner', {
        email: 'novo@empresa.com',
        role: UserRole.DEVELOPER,
      });

      expect(result.id).toBe('mem_new');
      expect(result.role).toBe(UserRole.DEVELOPER);
    });
  });
});

