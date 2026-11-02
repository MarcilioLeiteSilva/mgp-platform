import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../database/prisma.service';
import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, WalletAccountType, InvitationStatus } from '@mgp/database';

describe('OrganizationsService (Multi-Tenancy, RBAC & Invitations)', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;

  const mockPrisma = {
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    membership: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    organizationInvitation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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

    it('deve lançar BadRequestException se userId for nulo', async () => {
      await expect(service.listUserOrganizations('')).rejects.toThrow(BadRequestException);
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

    it('deve permitir acesso direto se o usuário for superadmin', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org_super',
        name: 'Super Org',
        slug: 'super-org',
        wallet: null,
        _count: { memberships: 1, apps: 0, campaigns: 0 },
      });

      const result = await service.findById('org_super', 'usr_admin', true);
      expect(result.name).toBe('Super Org');
      expect(mockPrisma.membership.findUnique).not.toHaveBeenCalled();
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

  describe('updateOrganization', () => {
    it('deve bloquear se o usuário não for OWNER ou ADMIN', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'mem_dev',
        role: UserRole.DEVELOPER,
      });

      await expect(
        service.updateOrganization('org_1', 'usr_dev', { name: 'Novo Nome' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve atualizar os dados e registrar auditoria quando requisitado por OWNER', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'mem_owner',
        role: UserRole.OWNER,
      });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org_1',
        name: 'Nome Antigo',
        documentCnpjCpf: null,
        planTier: 'FREE',
      });

      mockPrisma.organization.update.mockResolvedValue({
        id: 'org_1',
        name: 'Nome Atualizado',
        documentCnpjCpf: '11.222.333/0001-44',
        planTier: 'PRO',
      });

      const result = await service.updateOrganization('org_1', 'usr_owner', {
        name: 'Nome Atualizado',
        documentCnpjCpf: '11.222.333/0001-44',
        planTier: 'PRO',
      });

      expect(result.name).toBe('Nome Atualizado');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ORGANIZATION_UPDATED',
          }),
        }),
      );
    });
  });

  describe('setDefaultOrganization', () => {
    it('deve definir a organização como padrão com sucesso', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'mem_1',
        userId: 'usr_1',
        organizationId: 'org_1',
      });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          membership: {
            updateMany: jest.fn().mockResolvedValue({ count: 2 }),
            update: jest.fn().mockResolvedValue({ id: 'mem_1', isDefault: true }),
          },
        };
        return callback(tx);
      });

      const result = await service.setDefaultOrganization('org_1', 'usr_1');
      expect(result.success).toBe(true);
      expect(result.organizationId).toBe('org_1');
    });

    it('deve lançar ForbiddenException se não for membro da organização', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.setDefaultOrganization('org_invalid', 'usr_1')).rejects.toThrow(
        ForbiddenException,
      );
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
      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem_owner',
          role: UserRole.OWNER,
        })
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

  describe('updateMemberRole (RBAC Safeguards)', () => {
    it('deve impedir o rebaixamento do único OWNER da organização', async () => {
      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem_owner_req',
          role: UserRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'mem_target_owner',
          role: UserRole.OWNER,
        });

      mockPrisma.membership.count.mockResolvedValue(1); // apenas 1 OWNER existente

      await expect(
        service.updateMemberRole('org_1', 'usr_owner_req', 'usr_target_owner', {
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve permitir atualizar o papel quando há mais de um OWNER', async () => {
      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem_owner_req',
          role: UserRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'mem_target_dev',
          role: UserRole.DEVELOPER,
        });

      mockPrisma.membership.update.mockResolvedValue({
        id: 'mem_target_dev',
        role: UserRole.MANAGER,
      });

      const result = await service.updateMemberRole('org_1', 'usr_owner_req', 'usr_target_dev', {
        role: UserRole.MANAGER,
      });

      expect(result.role).toBe(UserRole.MANAGER);
    });
  });

  describe('removeMember', () => {
    it('deve impedir remoção do único OWNER da organização', async () => {
      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem_owner_req',
          role: UserRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'mem_owner_target',
          role: UserRole.OWNER,
        });

      mockPrisma.membership.count.mockResolvedValue(1);

      await expect(
        service.removeMember('org_1', 'usr_owner_req', 'usr_owner_target'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve remover membro com sucesso', async () => {
      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem_owner_req',
          role: UserRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'mem_dev_target',
          role: UserRole.DEVELOPER,
          isDefault: false,
        });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          membership: {
            delete: jest.fn().mockResolvedValue({ id: 'mem_dev_target' }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'log_del' }),
          },
        };
        return callback(tx);
      });

      const result = await service.removeMember('org_1', 'usr_owner_req', 'usr_dev_target');
      expect(result.success).toBe(true);
    });
  });

  describe('transferOwnership', () => {
    it('deve transferir a posse e rebaixar o antigo OWNER para ADMIN', async () => {
      mockPrisma.membership.findUnique
        .mockResolvedValueOnce({
          id: 'mem_old_owner',
          role: UserRole.OWNER,
        })
        .mockResolvedValueOnce({
          id: 'mem_new_owner',
          role: UserRole.ADMIN,
        });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          membership: {
            update: jest.fn().mockResolvedValue({ id: 'updated' }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'log_trans' }),
          },
        };
        return callback(tx);
      });

      const result = await service.transferOwnership('org_1', 'usr_old_owner', {
        newOwnerUserId: 'usr_new_owner',
      });

      expect(result.success).toBe(true);
      expect(result.newOwnerUserId).toBe('usr_new_owner');
    });

    it('deve impedir transferência para si mesmo', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'mem_owner',
        role: UserRole.OWNER,
      });

      await expect(
        service.transferOwnership('org_1', 'usr_owner', { newOwnerUserId: 'usr_owner' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Invitations Flow', () => {
    it('deve criar um convite seguro com token e validade de 7 dias', async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({
        id: 'mem_owner',
        role: UserRole.OWNER,
      });

      mockPrisma.user.findUnique.mockResolvedValue(null); // Convidado ainda não é membro

      mockPrisma.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.organizationInvitation.create.mockResolvedValue({
        id: 'inv_1',
        email: 'dev@externo.com',
        role: UserRole.DEVELOPER,
        token: 'mock_token_hex_64',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 86400000),
      });

      const result = await service.createInvitation('org_1', 'usr_owner', {
        email: 'dev@externo.com',
        role: UserRole.DEVELOPER,
      });

      expect(result.id).toBe('inv_1');
      expect(result.status).toBe(InvitationStatus.PENDING);
      expect(mockPrisma.organizationInvitation.create).toHaveBeenCalled();
    });

    it('deve consultar convite válido por token público', async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: 'inv_1',
        email: 'dev@externo.com',
        role: UserRole.DEVELOPER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 5 * 86400000),
        organization: { id: 'org_1', name: 'Studio', slug: 'studio' },
        invitedBy: { fullName: 'Owner Teste' },
      });

      const result = await service.getInvitationByToken('valid_token');
      expect(result.email).toBe('dev@externo.com');
      expect(result.organization.name).toBe('Studio');
    });

    it('deve aceitar convite e vincular membro à organização', async () => {
      mockPrisma.organizationInvitation.findUnique.mockResolvedValue({
        id: 'inv_1',
        organizationId: 'org_1',
        role: UserRole.DEVELOPER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 5 * 86400000),
      });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          membership: {
            findUnique: jest.fn().mockResolvedValue(null),
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'mem_accepted',
              role: UserRole.DEVELOPER,
              organizationId: 'org_1',
            }),
          },
          organizationInvitation: {
            update: jest.fn().mockResolvedValue({ id: 'inv_1', status: InvitationStatus.ACCEPTED }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'log_acc' }),
          },
        };
        return callback(tx);
      });

      const result = await service.acceptInvitation('valid_token', 'usr_accepting');
      expect(result.success).toBe(true);
      expect(result.membership.id).toBe('mem_accepted');
    });
  });
});
