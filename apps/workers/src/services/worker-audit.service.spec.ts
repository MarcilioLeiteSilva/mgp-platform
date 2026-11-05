import { WorkerAuditService } from './worker-audit.service';

describe('WorkerAuditService (Cálculo Heurístico de Auditoria ASO no Worker)', () => {
  let service: WorkerAuditService;

  beforeEach(() => {
    service = new WorkerAuditService();
  });

  it('deve calcular auditoria excelente para app completamente otimizado', () => {
    const result = service.calculateAudit({
      title: 'Nu: Conta, Cartão e Investir', // 28 caracteres (ideal: 20-30)
      summary: 'A sua conta digital completa, sem tarifas e com rendimento automático diário.', // 78 chars (ideal: 50-80)
      description: 'O aplicativo do Nu nasceu para devolver o controle da sua vida financeira... '.repeat(35), // ~2500 chars (ideal)
      icon: 'https://play-lh.googleusercontent.com/icon.png',
      screenshots: [
        'https://screenshot1.png',
        'https://screenshot2.png',
        'https://screenshot3.png',
        'https://screenshot4.png',
        'https://screenshot5.png',
        'https://screenshot6.png',
      ], // 6 prints (ideal)
      score: 4.8, // excelente
      ratings: 1200000,
    });

    expect(result.overallScore).toBeGreaterThanOrEqual(95);
    expect(result.titleScore).toBe(100);
    expect(result.shortDescriptionScore).toBe(100);
    expect(result.longDescriptionScore).toBe(100);
    expect(result.iconScore).toBe(100);
    expect(result.screenshotsScore).toBe(100);
    expect(result.ratingsScore).toBe(100);
    expect(result.recommendations).toHaveLength(0);
  });

  it('deve penalizar app sem título e sem screenshots gerando recomendações HIGH', () => {
    const result = service.calculateAudit({
      title: '',
      summary: '',
      description: 'Texto muito curto',
      icon: '',
      screenshots: [],
      score: 2.5,
      ratings: 10,
    });

    expect(result.overallScore).toBeLessThan(40);
    expect(result.titleScore).toBe(0);
    expect(result.screenshotsScore).toBe(0);
    expect(result.iconScore).toBe(20);

    const highSeverity = result.recommendations.filter((r) => r.severity === 'HIGH');
    expect(highSeverity.length).toBeGreaterThanOrEqual(4);
  });

  it('deve identificar título curto e sugerir expansão com palavra-chave', () => {
    const result = service.calculateAudit({
      title: 'Banco', // 5 caracteres (<15)
      summary: 'Conta digital completa para seu dia a dia e investimentos seguros.',
      description: 'Descrição de teste '.repeat(150),
      icon: 'https://icon.png',
      screenshots: ['1', '2', '3', '4', '5'],
      score: 4.2,
      ratings: 500,
    });

    expect(result.titleScore).toBe(60);
    const titleRec = result.recommendations.find((r) => r.category === 'TITLE');
    expect(titleRec).toBeDefined();
    expect(titleRec?.id).toBe('rec_title_short');
  });
});

