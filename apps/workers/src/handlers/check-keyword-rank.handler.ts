import { PrismaClient } from '@mgp/database';
import {
  AsoJobResult,
  AsoJobType,
  CheckKeywordRankJobPayload,
} from '@mgp/contracts';
import { WorkerScraperService } from '../services/worker-scraper.service';

export async function handleCheckKeywordRank(
  payload: CheckKeywordRankJobPayload,
  deps: {
    prisma: PrismaClient;
    scraper: WorkerScraperService;
  },
): Promise<AsoJobResult> {
  const startTime = Date.now();
  const { asoAppId, appKeywordId, keyword, appId, country, lang } = payload;

  const appKeyword = await deps.prisma.asoAppKeyword.findUnique({
    where: { id: appKeywordId },
    include: { asoApp: true, keyword: true },
  });

  if (!appKeyword) {
    throw new Error(`[CheckKeywordRank] Associação AsoAppKeyword id="${appKeywordId}" não encontrada.`);
  }

  const effectiveCountry = country || appKeyword.asoApp.country || 'br';
  const effectiveLang = lang || appKeyword.asoApp.lang || 'pt';
  const effectiveKeyword = keyword || appKeyword.keyword.keyword;
  const targetPackage = appId || appKeyword.asoApp.appId;

  // Busca a posição na Play Store
  const newRank = await deps.scraper.searchAppRank(
    effectiveKeyword,
    targetPackage,
    effectiveCountry,
    effectiveLang,
    100,
  );

  // Calcula novo bestRank
  let newBestRank = appKeyword.bestRank;
  if (newRank !== null) {
    newBestRank = newBestRank ? Math.min(newBestRank, newRank) : newRank;
  }

  // Atualiza AsoAppKeyword
  const updated = await deps.prisma.asoAppKeyword.update({
    where: { id: appKeyword.id },
    data: {
      previousRank: appKeyword.currentRank,
      currentRank: newRank,
      bestRank: newBestRank,
      lastTrackedAt: new Date(),
    },
  });

  // Grava snapshot histórico
  let historyId: string | undefined = undefined;
  if (newRank !== null) {
    const historyEntry = await deps.prisma.asoKeywordRankingHistory.create({
      data: {
        appKeywordId: appKeyword.id,
        rank: newRank,
        recordedAt: new Date(),
      },
    });
    historyId = historyEntry.id;
  }

  return {
    success: true,
    jobType: AsoJobType.CHECK_KEYWORD_RANK,
    entityId: appKeyword.id,
    message: `Rank da palavra-chave "${effectiveKeyword}" para o app "${targetPackage}": ${
      newRank !== null ? `#${newRank}` : 'Fora do top 100'
    }.`,
    data: {
      keyword: effectiveKeyword,
      appId: targetPackage,
      country: effectiveCountry,
      previousRank: appKeyword.currentRank,
      currentRank: newRank,
      bestRank: newBestRank,
      historySnapshotCreated: Boolean(historyId),
    },
    processedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

