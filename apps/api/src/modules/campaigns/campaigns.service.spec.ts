import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CampaignBillingModel, CampaignStatus, CampaignType, AdFormat, WalletAccountType } from '@mgp/database';

describe('CampaignsService', () => {
  let service: CampaignsService;
  let prisma: any;

  const orgId = 'org-adv-123';
  const sampleCampaign = {
    id: 'camp-001',
    organizationId: orgId,
    name: 'Campanha Black Friday',
    type: CampaignType.PAID,
    billingModel: CampaignBillingModel.CPM,
    bidAmount: 6.00,
    dailyBudget: 150.00,
    totalBudget: 3000.00,
    spentAmount: 0.00,
    frequencyCapPerHour: 3,
    priorityTier: 2,
    status: CampaignStatus.DRAFT,
    targetCountry: 'BR',
    targetCategories: 'GAMES',
    creatives: [
      {
        id: 'creat-001',
        campaignId: 'camp-001',
        format: AdFormat.BANNER,
        title: 'Super Promoção',
        imageUrl: 'https://cdn.mgp.io/b1.png',
        actionUrl: 'https://example.com/play',
        width: 320,
        height: 50,
        isActive: true,
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      campaign: {
        findMany: jest.fn().mockResolvedValue([sampleCampaign]),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'camp-001' && where.organizationId === orgId) {
            return Promise.resolve(sampleCampaign);
          }
          return Promise.resolve(null);
        }),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'camp-new', ...data, creatives: [] })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...sampleCampaign, ...data })),
        delete: jest.fn().mockResolvedValue(sampleCampaign),
      },
      creative: {
        findMany: jest.fn().mockResolvedValue(sampleCampaign.creatives),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'creat-001') return Promise.resolve(sampleCampaign.creatives[0]);
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'creat-new', ...data })),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...sampleCampaign.creatives[0], ...data })),
        delete: jest.fn().mockResolvedValue(sampleCampaign.creatives[0]),
      },
      wallet: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'wallet-001',
          organizationId: orgId,
          accounts: [
            {
              id: 'acc-adv',
              type: WalletAccountType.ADVERTISING_CREDITS,
              cachedBalance: 500.00,
            },
          ],
        }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-001' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
  });

  describe('listCampaigns', () => {
    it('deve listar campanhas da organização ativa com paginação', async () => {
      const result = await service.listCampaigns(orgId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.data[0].id).toBe('camp-001');
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: orgId }),
        }),
      );
    });

    it('deve lançar BadRequestException se organizationId não for fornecido', async () => {
      await expect(service.listCampaigns('', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('findCampaignById', () => {
    it('deve retornar a campanha quando pertencer à organização informada', async () => {
      const result = await service.findCampaignById('camp-001', orgId);
      expect(result.id).toBe('camp-001');
    });

    it('deve lançar NotFoundException quando a campanha pertencer a outro tenant (Zero Data Leakage)', async () => {
      await expect(service.findCampaignById('camp-001', 'other-org')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createCampaign', () => {
    it('deve criar uma campanha PAID quando houver saldo em carteira suficiente', async () => {
      const dto = {
        name: 'Campanha Nova',
        type: CampaignType.PAID,
        billingModel: CampaignBillingModel.CPM,
        bidAmount: 5.0,
        dailyBudget: 100.0,
        totalBudget: 1000.0,
      };

      const result = await service.createCampaign(orgId, dto);
      expect(result.id).toBe('camp-new');
      expect(result.status).toBe(CampaignStatus.DRAFT);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('deve rejeitar criação de campanha PAID se saldo for menor que o dailyBudget', async () => {
      prisma.wallet.findUnique.mockResolvedValueOnce({
        id: 'wallet-001',
        accounts: [{ type: WalletAccountType.ADVERTISING_CREDITS, cachedBalance: 10.00 }],
      });

      const dto = {
        name: 'Campanha Sem Saldo',
        type: CampaignType.PAID,
        billingModel: CampaignBillingModel.CPM,
        bidAmount: 5.0,
        dailyBudget: 100.0,
        totalBudget: 1000.0,
      };

      await expect(service.createCampaign(orgId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCampaignStatus', () => {
    it('deve alterar status para ACTIVE quando a campanha possuir criativo ativo e saldo', async () => {
      const result = await service.updateCampaignStatus('camp-001', orgId, {
        status: CampaignStatus.ACTIVE,
      });

      expect(result.status).toBe(CampaignStatus.ACTIVE);
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('deve rejeitar ativação de campanha que não possui nenhum criativo ativo', async () => {
      prisma.campaign.findFirst.mockResolvedValueOnce({
        ...sampleCampaign,
        creatives: [],
      });

      await expect(
        service.updateCampaignStatus('camp-001', orgId, { status: CampaignStatus.ACTIVE }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCampaign', () => {
    it('deve permitir exclusão de campanha em DRAFT', async () => {
      const result = await service.deleteCampaign('camp-001', orgId);
      expect(result.success).toBe(true);
      expect(prisma.campaign.delete).toHaveBeenCalledWith({ where: { id: 'camp-001' } });
    });

    it('deve impedir exclusão de campanha com status ACTIVE', async () => {
      prisma.campaign.findFirst.mockResolvedValueOnce({
        ...sampleCampaign,
        status: CampaignStatus.ACTIVE,
      });

      await expect(service.deleteCampaign('camp-001', orgId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Gestão de Criativos', () => {
    it('deve adicionar um criativo válido à campanha', async () => {
      const dto = {
        format: AdFormat.INTERSTITIAL,
        title: 'Novo Interstitial',
        imageUrl: 'https://cdn.mgp.io/int.png',
        actionUrl: 'https://example.com/click',
        skipOffsetSeconds: 5,
      };

      const result = await service.addCreative('camp-001', orgId, dto);
      expect(result.id).toBe('creat-new');
      expect(prisma.creative.create).toHaveBeenCalled();
    });

    it('deve atualizar propriedades de um criativo', async () => {
      const result = await service.updateCreative('camp-001', 'creat-001', orgId, {
        title: 'Título Atualizado',
      });

      expect(result.title).toBe('Título Atualizado');
    });

    it('deve excluir um criativo existente', async () => {
      const result = await service.deleteCreative('camp-001', 'creat-001', orgId);
      expect(result.success).toBe(true);
      expect(prisma.creative.delete).toHaveBeenCalledWith({ where: { id: 'creat-001' } });
    });
  });
});

