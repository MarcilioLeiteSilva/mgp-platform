import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../database/prisma.service';
import { PasswordService } from '../auth/password.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;
  let passwordService: PasswordService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockPasswordService = {
    compare: jest.fn(),
    hash: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: PasswordService,
          useValue: mockPasswordService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    passwordService = module.get<PasswordService>(PasswordService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('deve retornar o perfil completo do usuário', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        email: 'dev@mgp.com',
        fullName: 'Dev Usuário',
        isActive: true,
        isSuperadmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        memberships: [
          {
            id: 'mem_1',
            role: 'OWNER',
            isDefault: true,
            createdAt: new Date(),
            organization: {
              id: 'org_1',
              name: 'Acme Games',
              slug: 'acme-games',
              planTier: 'PRO',
              isVerified: true,
            },
          },
        ],
        _count: {
          sessions: 2,
        },
      });

      const profile = await service.getProfile('usr_1');
      expect(profile.id).toBe('usr_1');
      expect(profile.email).toBe('dev@mgp.com');
      expect(profile.activeSessionsCount).toBe(2);
      expect(profile.memberships).toHaveLength(1);
      expect(profile.memberships[0].organization.name).toBe('Acme Games');
    });

    it('deve lançar NotFoundException se o usuário não for encontrado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('usr_unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('deve atualizar o nome completo e registrar auditoria', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        fullName: 'Nome Antigo',
      });

      mockPrisma.user.update.mockResolvedValue({
        id: 'usr_1',
        email: 'dev@mgp.com',
        fullName: 'Nome Novo',
        isActive: true,
        isSuperadmin: false,
        updatedAt: new Date(),
      });

      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log_1' });

      const result = await service.updateProfile('usr_1', { fullName: 'Nome Novo' });
      expect(result.fullName).toBe('Nome Novo');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'USER_PROFILE_UPDATED',
          }),
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('deve lançar BadRequestException se a senha atual estiver incorreta', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        passwordHash: 'hash_atual',
      });

      mockPasswordService.compare.mockResolvedValue(false);

      await expect(
        service.changePassword('usr_1', {
          currentPassword: 'SenhaErrada123!',
          newPassword: 'NovaSenhaSegura456@',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve atualizar a senha com hash e revogar todas as sessões anteriores', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        passwordHash: 'hash_correto',
      });

      mockPasswordService.compare.mockResolvedValue(true);
      mockPasswordService.hash.mockResolvedValue('novo_hash_bcrypt');

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ id: 'usr_1' }),
          },
          session: {
            updateMany: jest.fn().mockResolvedValue({ count: 3 }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'log_pass' }),
          },
        };
        return callback(tx);
      });

      const result = await service.changePassword('usr_1', {
        currentPassword: 'SenhaCerta123!',
        newPassword: 'NovaSenhaSegura456@',
      });

      expect(result.success).toBe(true);
      expect(mockPasswordService.hash).toHaveBeenCalledWith('NovaSenhaSegura456@');
    });
  });
});
