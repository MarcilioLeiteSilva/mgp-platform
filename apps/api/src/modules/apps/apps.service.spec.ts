import { Test, TestingModule } from '@nestjs/testing';
import { AppsService } from './apps.service';
import { PrismaService } from '../../database/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { AppPlatform, AppStatus } from '@mgp/database';

describe('AppsService (Isolamento Multi-Tenant e Zero Data Leakage)', () => {
  let service: AppsService;
  let prisma: PrismaService;

  const mockPrisma = {
    app: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AppsService>(AppsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('deve estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('listApps', () => {
    it('deve filtrar estritamente pelo organizationId fornecido', async () => {
      mockPrisma.app.findMany.mockResolvedValue([
        {
          id: 'app_1',
          organizationId: 'org_alpha',
          name: 'Jogo Alpha',
          packageName: 'com.alpha.game',
          adUnits: [],
        },
      ]);

      const result = await service.listApps('org_alpha');
      expect(result).toHaveLength(1);
      expect(mockPrisma.app.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org_alpha' },
        include: {
          adUnits: true,
          _count: { select: { adUnits: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findAppById (Zero Data Leakage)', () => {
    it('deve retornar o aplicativo se ele pertencer à organização informada', async () => {
      mockPrisma.app.findFirst.mockResolvedValue({
        id: 'app_1',
        organizationId: 'org_alpha',
        name: 'Jogo Alpha',
        adUnits: [],
      });

      const result = await service.findAppById('app_1', 'org_alpha');
      expect(result.id).toBe('app_1');
      expect(mockPrisma.app.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'app_1',
          organizationId: 'org_alpha', // Escopo mandatório
        },
        include: { adUnits: true },
      });
    });

    it('deve lançar NotFoundException se o app existir no banco mas pertencer a OUTRA organização (Zero Data Leakage)', async () => {
      // O banco não retorna o registro porque a cláusula organizationId não coincide
      mockPrisma.app.findFirst.mockResolvedValue(null);

      await expect(service.findAppById('app_belonging_to_org_beta', 'org_alpha')).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrisma.app.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'app_belonging_to_org_beta',
          organizationId: 'org_alpha',
        },
        include: { adUnits: true },
      });
    });
  });

  describe('createApp', () => {
    it('deve cadastrar aplicativo com chave SDK gerada e associar ao tenant correto', async () => {
      mockPrisma.app.findUnique.mockResolvedValue(null);
      mockPrisma.app.create.mockResolvedValue({
        id: 'app_new',
        organizationId: 'org_alpha',
        name: 'Novo App',
        packageName: 'com.alpha.novo',
        platform: AppPlatform.ANDROID,
        status: AppStatus.ACTIVE,
        sdkKey: 'sdk_generated_key_123',
      });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log_1' });

      const result = await service.createApp(
        'org_alpha',
        {
          name: 'Novo App',
          packageName: 'com.alpha.novo',
          platform: AppPlatform.ANDROID,
        },
        'usr_1',
      );

      expect(result.id).toBe('app_new');
      expect(result.organizationId).toBe('org_alpha');
      expect(mockPrisma.app.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org_alpha',
            packageName: 'com.alpha.novo',
          }),
        }),
      );
    });

    it('deve lançar ConflictException se o mesmo package já existir na organização para a plataforma', async () => {
      mockPrisma.app.findUnique.mockResolvedValue({ id: 'app_conflict' });

      await expect(
        service.createApp('org_alpha', {
          name: 'Duplicado',
          packageName: 'com.alpha.duplicado',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});

