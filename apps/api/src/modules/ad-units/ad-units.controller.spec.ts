import { Test, TestingModule } from '@nestjs/testing';
import { AdUnitsController } from './ad-units.controller';
import { AdUnitsService } from './ad-units.service';
import { AdFormat } from '@mgp/database';

describe('AdUnitsController', () => {
  let controller: AdUnitsController;
  let service: jest.Mocked<AdUnitsService>;

  const orgId = 'org-pub-123';
  const mockReq = {
    tenant: { organizationId: orgId },
    user: { id: 'user-pub-1' },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Jest-Agent' },
  };

  beforeEach(async () => {
    const mockService = {
      listAdUnits: jest.fn(),
      createAdUnit: jest.fn(),
      getPublisherAnalytics: jest.fn(),
      findAdUnitById: jest.fn(),
      updateAdUnit: jest.fn(),
      deleteAdUnit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdUnitsController],
      providers: [
        {
          provide: AdUnitsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AdUnitsController>(AdUnitsController);
    service = module.get(AdUnitsService);
  });

  describe('listAdUnits', () => {
    it('deve chamar service.listAdUnits com o tenant do request', async () => {
      const query = { page: 1, limit: 10 };
      const expected = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      service.listAdUnits.mockResolvedValue(expected as any);

      const result = await controller.listAdUnits(query, undefined, mockReq);
      expect(service.listAdUnits).toHaveBeenCalledWith(orgId, query);
      expect(result).toBe(expected);
    });

    it('deve usar header x-organization-id caso req.tenant não exista', async () => {
      const query = { page: 1, limit: 10 };
      service.listAdUnits.mockResolvedValue({ data: [] } as any);

      await controller.listAdUnits(query, 'header-org-id', {});
      expect(service.listAdUnits).toHaveBeenCalledWith('header-org-id', query);
    });
  });

  describe('createAdUnit', () => {
    it('deve repassar criação de Ad Unit com contexto de auditoria', async () => {
      const dto = {
        appId: 'app-1',
        name: 'Banner Topo',
        format: AdFormat.BANNER,
        floorEcpm: 1.5,
      };
      const created = { id: 'unit-1', ...dto };
      service.createAdUnit.mockResolvedValue(created as any);

      const result = await controller.createAdUnit(dto, undefined, mockReq);
      expect(service.createAdUnit).toHaveBeenCalledWith(orgId, dto, {
        userId: 'user-pub-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(created);
    });
  });

  describe('getPublisherAnalytics', () => {
    it('deve retornar analytics de monetização do publisher', async () => {
      const query = { period: '30d' as const };
      const analytics = { summary: { totalAdUnits: 5, impressionsCount: 1000 } };
      service.getPublisherAnalytics.mockResolvedValue(analytics as any);

      const result = await controller.getPublisherAnalytics(query, undefined, mockReq);
      expect(service.getPublisherAnalytics).toHaveBeenCalledWith(orgId, query);
      expect(result).toEqual(analytics);
    });
  });

  describe('findAdUnitById', () => {
    it('deve buscar Ad Unit por ID e organização', async () => {
      const unit = { id: 'unit-1', name: 'Banner Topo' };
      service.findAdUnitById.mockResolvedValue(unit as any);

      const result = await controller.findAdUnitById('unit-1', undefined, mockReq);
      expect(service.findAdUnitById).toHaveBeenCalledWith('unit-1', orgId);
      expect(result).toEqual(unit);
    });
  });

  describe('updateAdUnit', () => {
    it('deve atualizar Ad Unit e passar contexto de auditoria', async () => {
      const dto = { name: 'Novo Nome', floorEcpm: 3.0 };
      const updated = { id: 'unit-1', ...dto };
      service.updateAdUnit.mockResolvedValue(updated as any);

      const result = await controller.updateAdUnit('unit-1', dto, undefined, mockReq);
      expect(service.updateAdUnit).toHaveBeenCalledWith('unit-1', orgId, dto, {
        userId: 'user-pub-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteAdUnit', () => {
    it('deve excluir Ad Unit', async () => {
      service.deleteAdUnit.mockResolvedValue({ success: true, message: 'Deletado' } as any);

      const result = await controller.deleteAdUnit('unit-1', undefined, mockReq);
      expect(service.deleteAdUnit).toHaveBeenCalledWith('unit-1', orgId, {
        userId: 'user-pub-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest-Agent',
      });
      expect(result.success).toBe(true);
    });
  });
});

