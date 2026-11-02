import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../../config/app-config.service';
import { PasswordService } from './password.service';
import {
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole, WalletAccountType } from '@mgp/database';

describe('AuthService (Autenticação, Tokens e Rotação de Sessão)', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  let jwtService: JwtService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    membership: {
      create: jest.fn(),
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
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue('mocked_access_jwt_token'),
  };

  const mockConfigService = {
    jwtAccessSecret: 'super-secret-key-at-least-32-characters-long!',
    jwtAccessExpiresIn: '15m',
    jwtRefreshSecret: 'super-secret-refresh-key-32-chars-long!',
    jwtRefreshExpiresIn: '7d',
  };

  const mockPasswordService = {
    hash: jest.fn().mockResolvedValue('hashed_password_123'),
    compare: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: AppConfigService, useValue: mockConfigService },
        { provide: PasswordService, useValue: mockPasswordService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    passwordService = module.get<PasswordService>(PasswordService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('deve lançar ConflictException se o e-mail já estiver cadastrado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'usr_existing' });

      await expect(
        service.register({
          fullName: 'Carlos Mendes',
          email: 'carlos@empresa.com',
          password: 'Password@123',
          organizationName: 'Empresa Alpha',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve criar usuário, organização, membresia OWNER, carteira com 3 contas e emitir tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          user: {
            create: jest.fn().mockResolvedValue({
              id: 'usr_new',
              email: 'carlos@empresa.com',
              fullName: 'Carlos Mendes',
              isActive: true,
              isSuperadmin: false,
            }),
          },
          organization: {
            create: jest.fn().mockResolvedValue({
              id: 'org_new',
              name: 'Empresa Alpha',
              slug: 'empresa-alpha',
            }),
          },
          membership: {
            create: jest.fn().mockResolvedValue({
              id: 'mem_new',
              role: UserRole.OWNER,
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

      mockPrisma.session.create.mockResolvedValue({ id: 'ses_1' });

      const result = await service.register({
        fullName: 'Carlos Mendes',
        email: 'carlos@empresa.com',
        password: 'Password@123',
        organizationName: 'Empresa Alpha',
      });

      expect(result.user.email).toBe('carlos@empresa.com');
      expect(result.organization.role).toBe(UserRole.OWNER);
      expect(result.tokens.accessToken).toBe('mocked_access_jwt_token');
      expect(result.tokens.refreshToken).toBeDefined();
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('deve lançar UnauthorizedException se o usuário não for encontrado', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'inexistente@empresa.com', password: 'Password@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException se a senha for inválida', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        email: 'carlos@empresa.com',
        passwordHash: 'hash',
        isActive: true,
      });

      mockPasswordService.compare.mockResolvedValue(false);

      await expect(
        service.login({ email: 'carlos@empresa.com', password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar ForbiddenException se a conta estiver desativada', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        email: 'carlos@empresa.com',
        passwordHash: 'hash',
        isActive: false,
        memberships: [{ organizationId: 'org_1', organization: { name: 'Alpha', slug: 'alpha' } }],
      });

      mockPasswordService.compare.mockResolvedValue(true);

      await expect(
        service.login({ email: 'carlos@empresa.com', password: 'CorrectPassword' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve autenticar e emitir tokens quando as credenciais forem válidas', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'usr_1',
        email: 'carlos@empresa.com',
        fullName: 'Carlos Mendes',
        passwordHash: 'hash',
        isActive: true,
        isSuperadmin: false,
        memberships: [
          {
            organizationId: 'org_1',
            role: UserRole.OWNER,
            isDefault: true,
            organization: { name: 'Empresa Alpha', slug: 'empresa-alpha' },
          },
        ],
      });

      mockPasswordService.compare.mockResolvedValue(true);
      mockPrisma.session.create.mockResolvedValue({ id: 'ses_1' });

      const result = await service.login({
        email: 'carlos@empresa.com',
        password: 'CorrectPassword',
      });

      expect(result.tokens.accessToken).toBe('mocked_access_jwt_token');
      expect(result.organization.id).toBe('org_1');
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });
  });

  describe('refreshToken (Detecção de Roubo e Rotação)', () => {
    it('deve revogar todas as sessões do usuário se um token revogado for reutilizado (Theft Detection)', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'ses_stolen',
        userId: 'usr_victim',
        isRevoked: true, // Já consumido anteriormente!
        expiresAt: new Date(Date.now() + 1000000),
      });

      await expect(service.refreshToken('replayed_stolen_token')).rejects.toThrow(
        UnauthorizedException,
      );

      // Verificação crítica de segurança: todas as sessões ativas foram encerradas
      expect(mockPrisma.session.updateMany).toHaveBeenCalledWith({
        where: { userId: 'usr_victim' },
        data: { isRevoked: true },
      });
    });

    it('deve realizar rotação atômica: revogar token anterior e emitir novo par de tokens', async () => {
      mockPrisma.session.findUnique.mockResolvedValue({
        id: 'ses_valid',
        userId: 'usr_valid',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 1000000),
        user: {
          id: 'usr_valid',
          email: 'valid@empresa.com',
          fullName: 'Valid User',
          isSuperadmin: false,
          memberships: [
            {
              organizationId: 'org_1',
              role: UserRole.DEVELOPER,
              isDefault: true,
              organization: { name: 'Alpha', slug: 'alpha' },
            },
          ],
        },
      });

      mockPrisma.session.update.mockResolvedValue({ id: 'ses_valid', isRevoked: true });
      mockPrisma.session.create.mockResolvedValue({ id: 'ses_new' });

      const result = await service.refreshToken('valid_refresh_token');

      expect(result.tokens.accessToken).toBe('mocked_access_jwt_token');
      expect(mockPrisma.session.update).toHaveBeenCalledWith({
        where: { id: 'ses_valid' },
        data: { isRevoked: true },
      });
      expect(mockPrisma.session.create).toHaveBeenCalled();
    });
  });
});

