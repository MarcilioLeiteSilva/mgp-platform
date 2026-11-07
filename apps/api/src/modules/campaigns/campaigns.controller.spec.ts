import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { CampaignStatus, AdFormat, CampaignType, CampaignBillingModel } from '@mgp/shared';

describe('CampaignsController', () => {
  let controller: CampaignsController;
  let service: jest.Mocked<CampaignsService>;

  const orgId = 'org-adv-123';
  const mockReq = {
    tenant: { organizationId: orgId },
    user: { id: 'user-456' },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Jest-Agent' },
  };

  beforeEach(async () => {
    const mockService = {
      listCampaigns: jest.fn(),
      createCampaign: jest.fn(),
      findCampaignById: jest.fn(),
      updateCampaign: jest.fn(),
      updateCampaignStatus: jest.fn(),
      deleteCampaign: jest.fn(),
      listCreatives: jest.fn(),
      addCreative: jest.fn(),
      updateCreative: jest.fn(),
      deleteCreative: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignsController],
      providers: [
        {
          provide: CampaignsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<CampaignsController>(CampaignsController);
    service = module.get(CampaignsService);
  });

  describe('listCampaigns', () => {
    it('deve chamar service.listCampaigns com tenant do request', async () => {
      const query = { page: 1, limit: 10 };
      const expectedResult = { items: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      service.listCampaigns.mockResolvedValue(expectedResult as any);

      const result = await controller.listCampaigns(query, undefined, mockReq);
      expect(service.listCampaigns).toHaveBeenCalledWith(orgId, query);
      expect(result).toBe(expectedResult);
    });

    it('deve usar x-organization-id header quando req.tenant não estiver presente', async () => {
      const query = { page: 1, limit: 10 };
      service.listCampaigns.mockResolvedValue({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 } as any);

      await controller.listCampaigns(query, 'header-org-id', {});
      expect(service.listCampaigns).toHaveBeenCalledWith('header-org-id', query);
    });
  });

  describe('createCampaign', () => {
    it('deve repassar criação de campanha com contexto de auditoria', async () => {
      const dto = {
        name: 'Campanha Black Friday',
        billingModel: CampaignBillingModel.CPM,
        type: CampaignType.PAID,
        bidAmount: 2.5,
        dailyBudget: 100.0,
        totalBudget: 2500.0,
      };
      const createdCampaign = { id: 'camp-1', ...dto, organizationId: orgId };
      service.createCampaign.mockResolvedValue(createdCampaign as any);

      const result = await controller.createCampaign(dto, undefined, mockReq);
      expect(service.createCampaign).toHaveBeenCalledWith(orgId, dto, {
        userId: 'user-456',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(createdCampaign);
    });
  });

  describe('findCampaignById', () => {
    it('deve buscar campanha por ID e organização', async () => {
      const camp = { id: 'camp-1', name: 'Campanha Teste', organizationId: orgId };
      service.findCampaignById.mockResolvedValue(camp as any);

      const result = await controller.findCampaignById('camp-1', undefined, mockReq);
      expect(service.findCampaignById).toHaveBeenCalledWith('camp-1', orgId);
      expect(result).toEqual(camp);
    });
  });

  describe('updateCampaign', () => {
    it('deve atualizar campanha e passar contexto de auditoria', async () => {
      const dto = { name: 'Novo Nome', dailyBudget: 200.0 };
      const updated = { id: 'camp-1', ...dto };
      service.updateCampaign.mockResolvedValue(updated as any);

      const result = await controller.updateCampaign('camp-1', dto, undefined, mockReq);
      expect(service.updateCampaign).toHaveBeenCalledWith('camp-1', orgId, dto, {
        userId: 'user-456',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('updateCampaignStatus', () => {
    it('deve atualizar status da campanha', async () => {
      const dto = { status: CampaignStatus.ACTIVE };
      const updated = { id: 'camp-1', status: CampaignStatus.ACTIVE };
      service.updateCampaignStatus.mockResolvedValue(updated as any);

      const result = await controller.updateCampaignStatus('camp-1', dto, undefined, mockReq);
      expect(service.updateCampaignStatus).toHaveBeenCalledWith('camp-1', orgId, dto, {
        userId: 'user-456',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteCampaign', () => {
    it('deve chamar deleção com auditoria', async () => {
      service.deleteCampaign.mockResolvedValue({ success: true, message: 'Campanha excluída' } as any);

      const result = await controller.deleteCampaign('camp-1', undefined, mockReq);
      expect(service.deleteCampaign).toHaveBeenCalledWith('camp-1', orgId, {
        userId: 'user-456',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Gestão de Criativos', () => {
    it('listCreatives: deve listar criativos da campanha', async () => {
      const creatives = [{ id: 'cr-1', name: 'Criativo Banner' }];
      service.listCreatives.mockResolvedValue(creatives as any);

      const result = await controller.listCreatives('camp-1', undefined, mockReq);
      expect(service.listCreatives).toHaveBeenCalledWith('camp-1', orgId);
      expect(result).toEqual(creatives);
    });

    it('addCreative: deve adicionar criativo na campanha', async () => {
      const dto = {
        name: 'Banner 320x50',
        format: AdFormat.BANNER,
        title: 'Baixe Agora!',
        imageUrl: 'https://cdn.example.com/banner.png',
        actionUrl: 'https://app.example.com/download',
        width: 320,
        height: 50,
      };
      const createdCreative = { id: 'cr-1', ...dto, campaignId: 'camp-1' };
      service.addCreative.mockResolvedValue(createdCreative as any);

      const result = await controller.addCreative('camp-1', dto, undefined, mockReq);
      expect(service.addCreative).toHaveBeenCalledWith('camp-1', orgId, dto, {
        userId: 'user-456',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(createdCreative);
    });

    it('updateCreative: deve atualizar criativo na campanha', async () => {
      const dto = { name: 'Novo Banner Atualizado', isActive: false };
      const updatedCreative = { id: 'cr-1', ...dto };
      service.updateCreative.mockResolvedValue(updatedCreative as any);

      const result = await controller.updateCreative('camp-1', 'cr-1', dto, undefined, mockReq);
      expect(service.updateCreative).toHaveBeenCalledWith('camp-1', 'cr-1', orgId, dto, {
        userId: 'user-456',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(updatedCreative);
    });

    it('deleteCreative: deve excluir criativo da campanha', async () => {
      service.deleteCreative.mockResolvedValue({ success: true, message: 'Criativo removido' } as any);

      const result = await controller.deleteCreative('camp-1', 'cr-1', undefined, mockReq);
      expect(service.deleteCreative).toHaveBeenCalledWith('camp-1', 'cr-1', orgId, {
        userId: 'user-456',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result.success).toBe(true);
    });
  });
});
