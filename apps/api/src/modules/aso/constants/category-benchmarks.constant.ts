/**
 * Parâmetros de calibração estatística para modelagem preditiva de downloads e receita (Power-Law / Pareto).
 *
 * Modelo: Downloads(r) = alpha * (r ^ -beta)
 * Onde 'r' é o rank na categoria, alpha e beta são coeficientes empíricos ajustados por setor e localidade.
 */

export interface CategoryBenchmarkConfig {
  category: string;
  categoryLabel: string;
  alpha: number; // Volume base no topo (rank 1)
  beta: number;  // Taxa de declínio da cauda longa
  arpuMonthlyBrl: number; // ARPU médio mensal estimado em BRL
  arpuMonthlyUsd: number; // ARPU médio mensal estimado em USD
  typicalPayerConversionRate: number; // % de usuários pagantes (IAP)
  adArpuPerDownloadBrl: number; // Receita de anúncios estimada por novo download
  installsMultiplierRange: {
    minDailyFactor: number;
    maxDailyFactor: number;
  };
}

export const PLAY_STORE_CATEGORY_BENCHMARKS: Record<string, CategoryBenchmarkConfig> = {
  GAME: {
    category: 'GAME',
    categoryLabel: 'Jogos Mobile',
    alpha: 85000,
    beta: 0.88,
    arpuMonthlyBrl: 4.80,
    arpuMonthlyUsd: 0.95,
    typicalPayerConversionRate: 0.045,
    adArpuPerDownloadBrl: 0.18,
    installsMultiplierRange: { minDailyFactor: 0.0005, maxDailyFactor: 0.045 },
  },
  FINANCE: {
    category: 'FINANCE',
    categoryLabel: 'Finanças & Bancos',
    alpha: 65000,
    beta: 0.84,
    arpuMonthlyBrl: 8.50,
    arpuMonthlyUsd: 1.65,
    typicalPayerConversionRate: 0.065,
    adArpuPerDownloadBrl: 0.35,
    installsMultiplierRange: { minDailyFactor: 0.0004, maxDailyFactor: 0.035 },
  },
  SHOPPING: {
    category: 'SHOPPING',
    categoryLabel: 'Compras & E-commerce',
    alpha: 72000,
    beta: 0.85,
    arpuMonthlyBrl: 6.20,
    arpuMonthlyUsd: 1.20,
    typicalPayerConversionRate: 0.055,
    adArpuPerDownloadBrl: 0.22,
    installsMultiplierRange: { minDailyFactor: 0.0004, maxDailyFactor: 0.038 },
  },
  SOCIAL: {
    category: 'SOCIAL',
    categoryLabel: 'Redes Sociais & Comunicação',
    alpha: 80000,
    beta: 0.87,
    arpuMonthlyBrl: 3.20,
    arpuMonthlyUsd: 0.60,
    typicalPayerConversionRate: 0.025,
    adArpuPerDownloadBrl: 0.15,
    installsMultiplierRange: { minDailyFactor: 0.0006, maxDailyFactor: 0.050 },
  },
  PRODUCTIVITY: {
    category: 'PRODUCTIVITY',
    categoryLabel: 'Produtividade & Utilitários',
    alpha: 35000,
    beta: 0.79,
    arpuMonthlyBrl: 5.40,
    arpuMonthlyUsd: 1.05,
    typicalPayerConversionRate: 0.040,
    adArpuPerDownloadBrl: 0.12,
    installsMultiplierRange: { minDailyFactor: 0.0003, maxDailyFactor: 0.025 },
  },
  TOOLS: {
    category: 'TOOLS',
    categoryLabel: 'Ferramentas & Sistema',
    alpha: 40000,
    beta: 0.80,
    arpuMonthlyBrl: 2.80,
    arpuMonthlyUsd: 0.55,
    typicalPayerConversionRate: 0.020,
    adArpuPerDownloadBrl: 0.14,
    installsMultiplierRange: { minDailyFactor: 0.0003, maxDailyFactor: 0.030 },
  },
  ENTERTAINMENT: {
    category: 'ENTERTAINMENT',
    categoryLabel: 'Entretenimento & Streaming',
    alpha: 58000,
    beta: 0.83,
    arpuMonthlyBrl: 6.80,
    arpuMonthlyUsd: 1.30,
    typicalPayerConversionRate: 0.050,
    adArpuPerDownloadBrl: 0.20,
    installsMultiplierRange: { minDailyFactor: 0.0004, maxDailyFactor: 0.040 },
  },
  HEALTH_AND_FITNESS: {
    category: 'HEALTH_AND_FITNESS',
    categoryLabel: 'Saúde & Bem-Estar',
    alpha: 28000,
    beta: 0.76,
    arpuMonthlyBrl: 7.20,
    arpuMonthlyUsd: 1.40,
    typicalPayerConversionRate: 0.058,
    adArpuPerDownloadBrl: 0.15,
    installsMultiplierRange: { minDailyFactor: 0.00025, maxDailyFactor: 0.022 },
  },
  EDUCATION: {
    category: 'EDUCATION',
    categoryLabel: 'Educação & Ensino',
    alpha: 25000,
    beta: 0.75,
    arpuMonthlyBrl: 4.50,
    arpuMonthlyUsd: 0.85,
    typicalPayerConversionRate: 0.035,
    adArpuPerDownloadBrl: 0.10,
    installsMultiplierRange: { minDailyFactor: 0.0002, maxDailyFactor: 0.020 },
  },
  DEFAULT: {
    category: 'DEFAULT',
    categoryLabel: 'Geral / Outros Aplicativos',
    alpha: 30000,
    beta: 0.78,
    arpuMonthlyBrl: 4.00,
    arpuMonthlyUsd: 0.75,
    typicalPayerConversionRate: 0.030,
    adArpuPerDownloadBrl: 0.12,
    installsMultiplierRange: { minDailyFactor: 0.0003, maxDailyFactor: 0.025 },
  },
};

/**
 * Normaliza categoria do Google Play para uma chave de benchmark conhecida.
 */
export function resolveCategoryBenchmark(genreOrCategory?: string | null): CategoryBenchmarkConfig {
  if (!genreOrCategory) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.DEFAULT;
  }

  const normalized = genreOrCategory.toUpperCase().trim().replace(/\s+/g, '_');

  if (PLAY_STORE_CATEGORY_BENCHMARKS[normalized]) {
    return PLAY_STORE_CATEGORY_BENCHMARKS[normalized];
  }

  if (normalized.includes('GAME') || normalized.includes('ACTION') || normalized.includes('CASUAL') || normalized.includes('PUZZLE')) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.GAME;
  }
  if (normalized.includes('FINANC') || normalized.includes('BANK')) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.FINANCE;
  }
  if (normalized.includes('SHOP') || normalized.includes('STORE')) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.SHOPPING;
  }
  if (normalized.includes('SOCIAL') || normalized.includes('COMMUNICATION')) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.SOCIAL;
  }
  if (normalized.includes('PRODUCTIVITY') || normalized.includes('BUSINESS')) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.PRODUCTIVITY;
  }
  if (normalized.includes('TOOL') || normalized.includes('UTILITY')) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.TOOLS;
  }
  if (normalized.includes('ENTERTAIN') || normalized.includes('VIDEO') || normalized.includes('MUSIC')) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.ENTERTAINMENT;
  }
  if (normalized.includes('HEALTH') || normalized.includes('FITNESS')) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.HEALTH_AND_FITNESS;
  }
  if (normalized.includes('EDUCAT') || normalized.includes('LEARN')) {
    return PLAY_STORE_CATEGORY_BENCHMARKS.EDUCATION;
  }

  return PLAY_STORE_CATEGORY_BENCHMARKS.DEFAULT;
}

