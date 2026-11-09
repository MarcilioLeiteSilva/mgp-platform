import { Test, TestingModule } from '@nestjs/testing';
import { AsoAiRecommendationsController } from './aso-ai-recommendations.controller';
import { AsoAiRecommendationsService } from '../services/aso-ai-recommendations.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { AsoAiRecommendationDto } from '@mgp/contracts';

describe('AsoAiRecommendationsController', () => {
  let controller: AsoAiRecommendationsController;
  let service: any;

  const mockRecommendation: AsoAiRecommendationDto = {
    id: 'rec-ctrl-1',
    organizationId: 'org-1',
    asoAppId: 'app-1',
    type: 'TITLE_OPTIMIZATION',
    status: 'ACTIVE',
    category: 'FINANCE',
    targetKeywords: ['finanças'],
    inputContext: { appTitle: 'Fintech App' },
    suggestions: [
      {
        id: 'sug-1',
        field: 'title',
        currentValue: 'Fintech App',
        suggestedValue: 'Fintech App: Finanças',
        impactScore: 88,
        rationale: 'Palavra-chave de alta conversão.',
        characterCount: 22,
        maxCharacters: 30,
      },
    ],
    modelUsed: 'heuristic-ai-v1',
    appliedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    service = {
      generateRecommendations: jest.fn().mockResolvedValue(mockRecommendation),
      listRecommendations: jest.fn().mockResolvedValue([mockRecommendation]),
      applyRecommendation: jest.fn().mockResolvedValue({
        ...mockRecommendation,
        status: 'APPLIED',
        appliedAt: new Date().toISOString(),
      }),
      dismissRecommendation: jest.fn().mockResolvedValue({
        ...mockRecommendation,
        status: 'DISMISSED',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsoAiRecommendationsController],
      providers: [{ provide: AsoAiRecommendationsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AsoAiRecommendationsController>(AsoAiRecommendationsController);
  });

  it('deve ser instanciado corretamente', () => {
    expect(controller).toBeDefined();
  });

  it('POST /apps/:id/ai/recommendations/generate deve delegar ao serviço e retornar recomendação gerada', async () => {
    const result = await controller.generateRecommendations('app-1', 'org-1', {
      type: 'TITLE_OPTIMIZATION',
      focusKeywords: ['finanças'],
    });

    expect(service.generateRecommendations).toHaveBeenCalledWith('app-1', 'org-1', {
      type: 'TITLE_OPTIMIZATION',
      focusKeywords: ['finanças'],
    });
    expect(result.id).toBe('rec-ctrl-1');
    expect(result.type).toBe('TITLE_OPTIMIZATION');
  });

  it('GET /apps/:id/ai/recommendations deve listar o histórico de recomendações do app', async () => {
    const result = await controller.listRecommendations('app-1', 'org-1', {
      type: 'TITLE_OPTIMIZATION',
    });

    expect(service.listRecommendations).toHaveBeenCalledWith('app-1', 'org-1', {
      type: 'TITLE_OPTIMIZATION',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rec-ctrl-1');
  });

  it('POST /ai/recommendations/:id/apply deve aplicar a sugestão selecionada', async () => {
    const result = await controller.applyRecommendation('rec-ctrl-1', 'org-1', {
      suggestionId: 'sug-1',
    });

    expect(service.applyRecommendation).toHaveBeenCalledWith('rec-ctrl-1', 'org-1', {
      suggestionId: 'sug-1',
    });
    expect(result.status).toBe('APPLIED');
  });

  it('POST /ai/recommendations/:id/dismiss deve descartar a recomendação', async () => {
    const result = await controller.dismissRecommendation('rec-ctrl-1', 'org-1');

    expect(service.dismissRecommendation).toHaveBeenCalledWith('rec-ctrl-1', 'org-1');
    expect(result.status).toBe('DISMISSED');
  });
});
