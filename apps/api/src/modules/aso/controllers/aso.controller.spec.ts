import { Test, TestingModule } from '@nestjs/testing';
import { AsoController } from './aso.controller';
import { AsoAppsService } from '../services/aso-apps.service';
import { AsoKeywordsService } from '../services/aso-keywords.service';
import { AsoAuditService } from '../services/aso-audit.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';

describe('AsoController (Endpoints REST do Módulo Central ASO)', () => {
  let controller: AsoController;
  let appsService: AsoAppsService;
  let keywordsService: AsoKeywordsService;
  let auditService: AsoAuditService;

  const mockApp = {
    id: 'aso-app-1',
    organizationId: 'org-1',
    appId: 'com.whatsapp',
    title: 'WhatsApp Messenger',
  };

  const mockAppKeyword = {
    id: 'app-kw-1',
    asoAppId: 'aso-app-1',
    keywordId: 'kw-1',
    currentRank: 3,
  };

  const mockAudit = {
    id: 'audit-1',
    asoAppId: 'aso-app-1',
    overallScore: 90,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsoController],
      providers: [
        {
          provide: AsoAppsService,
          useValue: {
            trackApp: jest.fn().mockResolvedValue(mockApp),
            listApps: jest.fn().mockResolvedValue({ data: [mockApp], total: 1 }),
            getAppById: jest.fn().mockResolvedValue(mockApp),
            syncApp: jest.fn().mockResolvedValue(mockApp),
            deleteApp: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: AsoKeywordsService,
          useValue: {
            trackKeyword: jest.fn().mockResolvedValue(mockAppKeyword),
            listTrackedKeywords: jest.fn().mockResolvedValue([mockAppKeyword]),
            checkRank: jest.fn().mockResolvedValue(mockAppKeyword),
            getKeywordHistory: jest.fn().mockResolvedValue({ history: [] }),
            untrackKeyword: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: AsoAuditService,
          useValue: {
            runAudit: jest.fn().mockResolvedValue(mockAudit),
            getLatestAudit: jest.fn().mockResolvedValue(mockAudit),
            getAuditHistory: jest.fn().mockResolvedValue([mockAudit]),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AsoController>(AsoController);
    appsService = module.get<AsoAppsService>(AsoAppsService);
    keywordsService = module.get<AsoKeywordsService>(AsoKeywordsService);
    auditService = module.get<AsoAuditService>(AsoAuditService);
  });

  it('deve ser instanciado corretamente', () => {
    expect(controller).toBeDefined();
  });

  describe('Apps Endpoints', () => {
    it('POST /aso/apps - deve cadastrar aplicativo monitorado', async () => {
      const result = await controller.trackApp(
        { appId: 'com.whatsapp' },
        'org-1',
        undefined,
        {},
      );
      expect(result).toEqual(mockApp);
      expect(appsService.trackApp).toHaveBeenCalledWith('org-1', { appId: 'com.whatsapp' });
    });

    it('GET /aso/apps - deve listar aplicativos com tenant context', async () => {
      const result = await controller.listApps({}, 'org-1', undefined, {});
      expect(result.data).toHaveLength(1);
      expect(appsService.listApps).toHaveBeenCalledWith('org-1', {});
    });

    it('GET /aso/apps/:id - deve obter detalhes do aplicativo', async () => {
      const result = await controller.getAppById('aso-app-1', 'org-1', undefined, {});
      expect(result).toEqual(mockApp);
      expect(appsService.getAppById).toHaveBeenCalledWith('org-1', 'aso-app-1');
    });

    it('POST /aso/apps/:id/sync - deve sincronizar metadados frescos', async () => {
      const result = await controller.syncApp('aso-app-1', 'org-1', undefined, {});
      expect(result).toEqual(mockApp);
      expect(appsService.syncApp).toHaveBeenCalledWith('org-1', 'aso-app-1');
    });

    it('DELETE /aso/apps/:id - deve excluir aplicativo do monitoramento', async () => {
      const result = await controller.deleteApp('aso-app-1', 'org-1', undefined, {});
      expect(result.success).toBe(true);
      expect(appsService.deleteApp).toHaveBeenCalledWith('org-1', 'aso-app-1');
    });
  });

  describe('Keywords Endpoints', () => {
    it('POST /aso/apps/:id/keywords - deve rastrear nova keyword', async () => {
      const result = await controller.trackKeyword(
        'aso-app-1',
        { keyword: 'chat' },
        'org-1',
        undefined,
        {},
      );
      expect(result).toEqual(mockAppKeyword);
      expect(keywordsService.trackKeyword).toHaveBeenCalledWith(
        'org-1',
        'aso-app-1',
        { keyword: 'chat' },
      );
    });

    it('GET /aso/apps/:id/keywords - deve listar keywords rastreadas', async () => {
      const result = await controller.listTrackedKeywords('aso-app-1', 'org-1', undefined, {});
      expect(result).toHaveLength(1);
      expect(keywordsService.listTrackedKeywords).toHaveBeenCalledWith('org-1', 'aso-app-1');
    });

    it('POST /aso/apps/:id/keywords/:keywordId/check - deve forçar rechecagem de ranking', async () => {
      const result = await controller.checkRank(
        'aso-app-1',
        'kw-1',
        'org-1',
        undefined,
        {},
      );
      expect(result).toEqual(mockAppKeyword);
      expect(keywordsService.checkRank).toHaveBeenCalledWith('org-1', 'aso-app-1', 'kw-1');
    });

    it('GET /aso/apps/:id/keywords/:keywordId/history - deve obter série temporal', async () => {
      const result = await controller.getKeywordHistory(
        'aso-app-1',
        'kw-1',
        { days: 15 },
        'org-1',
        undefined,
        {},
      );
      expect(result).toEqual({ history: [] });
      expect(keywordsService.getKeywordHistory).toHaveBeenCalledWith(
        'org-1',
        'aso-app-1',
        'kw-1',
        15,
      );
    });

    it('DELETE /aso/apps/:id/keywords/:keywordId - deve desvincular keyword', async () => {
      const result = await controller.untrackKeyword(
        'aso-app-1',
        'kw-1',
        'org-1',
        undefined,
        {},
      );
      expect(result.success).toBe(true);
      expect(keywordsService.untrackKeyword).toHaveBeenCalledWith('org-1', 'aso-app-1', 'kw-1');
    });
  });

  describe('Audit Endpoints', () => {
    it('POST /aso/apps/:id/audit - deve executar auditoria heurística', async () => {
      const result = await controller.runAudit('aso-app-1', 'org-1', undefined, {});
      expect(result).toEqual(mockAudit);
      expect(auditService.runAudit).toHaveBeenCalledWith('org-1', 'aso-app-1');
    });

    it('GET /aso/apps/:id/audit/latest - deve obter último laudo de auditoria', async () => {
      const result = await controller.getLatestAudit('aso-app-1', 'org-1', undefined, {});
      expect(result).toEqual(mockAudit);
      expect(auditService.getLatestAudit).toHaveBeenCalledWith('org-1', 'aso-app-1');
    });

    it('GET /aso/apps/:id/audit/history - deve obter histórico de auditorias', async () => {
      const result = await controller.getAuditHistory('aso-app-1', 'org-1', undefined, {});
      expect(result).toHaveLength(1);
      expect(auditService.getAuditHistory).toHaveBeenCalledWith('org-1', 'aso-app-1');
    });
  });
});

