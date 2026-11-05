export interface AsoAppDto {
  id: string;
  organizationId: string;
  appId: string;
  platform: 'ANDROID' | 'IOS';
  title: string;
  developer: string;
  developerId?: string | null;
  icon: string;
  genre?: string | null;
  genreId?: string | null;
  score?: number | null;
  ratings?: number | null;
  reviews?: number | null;
  minInstalls?: number | string | null;
  isMonitored: boolean;
  isCompetitor: boolean;
  targetAppId?: string | null;
  country: string;
  lang: string;
  metadata?: Record<string, any> | null;
  lastScrapedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AsoKeywordDto {
  id: string;
  keyword: string;
  country: string;
  lang: string;
  searchVolume?: number | null;
  difficulty?: number | null;
  relevance?: number | null;
  lastTrackedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AsoAppKeywordDto {
  id: string;
  asoAppId: string;
  keywordId: string;
  currentRank?: number | null;
  previousRank?: number | null;
  bestRank?: number | null;
  tag?: string | null;
  isActive: boolean;
  lastTrackedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  keyword?: AsoKeywordDto;
}

export interface AsoKeywordRankingHistoryDto {
  id: string;
  appKeywordId: string;
  rank: number;
  recordedAt: Date | string;
}

export interface AsoAuditRecommendationItem {
  id: string;
  category: 'TITLE' | 'DESCRIPTION' | 'GRAPHICS' | 'RATINGS';
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  message: string;
  suggestedAction: string;
}

export interface AsoAuditScoreDto {
  id: string;
  asoAppId: string;
  overallScore: number;
  titleScore: number;
  shortDescriptionScore: number;
  longDescriptionScore: number;
  iconScore: number;
  screenshotsScore: number;
  ratingsScore: number;
  recommendations: AsoAuditRecommendationItem[] | Record<string, any>;
  auditDate: Date | string;
}

export interface TrackAppKeywordInput {
  keyword: string;
  tag?: string;
  country?: string;
  lang?: string;
}
