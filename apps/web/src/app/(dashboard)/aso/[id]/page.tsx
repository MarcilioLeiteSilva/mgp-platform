'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  Smartphone,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Calendar,
  Layers,
  Star,
  Download,
  Loader2,
  LineChart,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AuditGauge } from '@/components/aso/audit-gauge';
import { RankingChart, RankingHistoryPoint } from '@/components/aso/ranking-chart';
import { AddKeywordModal } from '@/components/aso/add-keyword-modal';

export default function AsoAppDetailPage() {
  const params = useParams();
  const appIdParam = params?.id as string;

  // Data State
  const [app, setApp] = useState<any | null>(null);
  const [keywords, setKeywords] = useState<any[]>([]);
  const [latestAudit, setLatestAudit] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'keywords' | 'audit' | 'metadata'>('keywords');

  // Keyword Filters & Modal
  const [keywordFilter, setKeywordFilter] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [isAddKeywordModalOpen, setIsAddKeywordModalOpen] = useState(false);
  const [checkingKeywordId, setCheckingKeywordId] = useState<string | null>(null);

  // Ranking Chart Modal State
  const [selectedChartKeyword, setSelectedChartKeyword] = useState<{
    id: string;
    keyword: string;
    currentRank: number | null;
    bestRank: number | null;
    history: RankingHistoryPoint[];
  } | null>(null);
  const [isLoadingChart, setIsLoadingChart] = useState(false);

  // Recommendations Filter
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  // Actions Loading & Feedback
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Carrega os detalhes do aplicativo
  const loadAppData = useCallback(async () => {
    if (!appIdParam) return;
    setIsLoading(true);

    try {
      const [appRes, keywordsRes, auditRes] = await Promise.all([
        api.get(`/aso/apps/${appIdParam}`),
        api.get(`/aso/apps/${appIdParam}/keywords`),
        api.get(`/aso/apps/${appIdParam}/audit/latest`),
      ]);

      if (appRes.success) {
        setApp(appRes.data);
      }
      if (keywordsRes.success && Array.isArray(keywordsRes.data)) {
        setKeywords(keywordsRes.data);
      }
      if (auditRes.success) {
        setLatestAudit(auditRes.data);
      }
    } catch (err: any) {
      showToast(err.message || 'Falha ao carregar dados do aplicativo.');
    } finally {
      setIsLoading(false);
    }
  }, [appIdParam]);

  useEffect(() => {
    loadAppData();
  }, [loadAppData]);

  // Sincroniza metadados com a loja
  const handleSyncApp = async () => {
    setIsSyncing(true);
    try {
      const res = await api.post(`/aso/apps/${appIdParam}/sync`);
      if (res.success) {
        showToast('Metadados e auditoria sincronizados com a Google Play Store!');
        loadAppData();
      } else {
        showToast(res.error || 'Falha na sincronização.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro de rede na sincronização.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Recalcula auditoria ASO
  const handleRunAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await api.post(`/aso/apps/${appIdParam}/audit`);
      if (res.success) {
        showToast('Auditoria ASO recalculada com sucesso!');
        setLatestAudit(res.data);
      } else {
        showToast(res.error || 'Falha ao auditar aplicativo.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro de rede na auditoria.');
    } finally {
      setIsAuditing(false);
    }
  };

  // Checa posição de palavra-chave ao vivo
  const handleCheckKeywordRank = async (keywordId: string, kwText: string) => {
    setCheckingKeywordId(keywordId);
    try {
      const res = await api.post(`/aso/apps/${appIdParam}/keywords/${keywordId}/check`);
      if (res.success) {
        const rank = res.data?.currentRank;
        showToast(`Posição atualizada para "${kwText}": ${rank ? `#${rank}` : 'Fora do top 100'}`);
        // Atualiza na lista local
        setKeywords((prev) =>
          prev.map((k) => (k.id === keywordId ? { ...k, ...res.data } : k)),
        );
      } else {
        showToast(res.error || 'Falha ao checar posição.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro na verificação de ranking.');
    } finally {
      setCheckingKeywordId(null);
    }
  };

  // Abre histórico de ranking para o gráfico
  const handleOpenChart = async (item: any) => {
    setIsLoadingChart(true);
    try {
      const res = await api.get(`/aso/apps/${appIdParam}/keywords/${item.keywordId}/history?days=30`);
      if (res.success) {
        setSelectedChartKeyword({
          id: item.id,
          keyword: item.keyword?.keyword || 'Palavra-chave',
          currentRank: item.currentRank,
          bestRank: item.bestRank,
          history: res.data?.history || [],
        });
      }
    } catch (err: any) {
      showToast(err.message || 'Falha ao buscar histórico de ranking.');
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Remove palavra-chave
  const handleUntrackKeyword = async (keywordId: string, kwText: string) => {
    if (!confirm(`Deseja remover a palavra-chave "${kwText}" do monitoramento deste app?`)) {
      return;
    }
    try {
      const res = await api.delete(`/aso/apps/${appIdParam}/keywords/${keywordId}`);
      if (res.success) {
        showToast(`Palavra-chave "${kwText}" removida com sucesso.`);
        setKeywords((prev) => prev.filter((k) => k.keywordId !== keywordId && k.id !== keywordId));
      } else {
        showToast(res.error || 'Falha ao desvincular palavra-chave.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro na exclusão.');
    }
  };

  // Filtragem de palavras-chave
  const filteredKeywords = keywords.filter((k) => {
    const text = (k.keyword?.keyword || '').toLowerCase();
    const matchesText = text.includes(keywordFilter.toLowerCase());
    const matchesTag = tagFilter === 'all' || k.tag === tagFilter;
    return matchesText && matchesTag;
  });

  // Recomendações de auditoria filtradas
  const rawRecommendations = Array.isArray(latestAudit?.recommendations)
    ? latestAudit.recommendations
    : [];
  const filteredRecommendations = rawRecommendations.filter((r: any) => {
    if (severityFilter === 'all') return true;
    return r.severity === severityFilter;
  });

  if (isLoading && !app) {
    return (
      <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-3" />
        <p className="text-sm">Carregando painel ASO do aplicativo...</p>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-white">Aplicativo não encontrado</h2>
        <p className="text-xs">O aplicativo solicitado não existe ou não pertence a esta organização.</p>
        <Link
          href="/aso"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Voltar ao ASO Studio
        </Link>
      </div>
    );
  }

  const overallScore = latestAudit?.overallScore ?? null;

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl border border-blue-400 text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/aso" className="hover:text-white flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-4 h-4" /> ASO Studio
        </Link>
        <span>/</span>
        <span className="text-white font-medium">{app.title}</span>
      </div>

      {/* App Hero Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <img
            src={app.icon || '/placeholder.png'}
            alt={app.title}
            className="w-20 h-20 rounded-2xl object-cover bg-slate-800 border border-slate-700 shadow-md shrink-0"
          />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-tight">{app.title}</h1>
              {app.isCompetitor ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Concorrente
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  App Principal
                </span>
              )}
              {app.genre && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300">
                  {app.genre}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400">
              Desenvolvedor: <span className="text-slate-200 font-semibold">{app.developer}</span>
            </p>

            <div className="flex items-center gap-3 pt-1 text-xs font-mono text-slate-400">
              <span className="text-slate-500">{app.appId}</span>
              <span>•</span>
              <span className="text-amber-400 font-bold flex items-center gap-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {app.score ? Number(app.score).toFixed(1) : '—'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Download className="w-3.5 h-3.5 text-blue-400" />
                {app.minInstalls ? `${app.minInstalls.toLocaleString('pt-BR')}+` : '—'}
              </span>
              <span>•</span>
              <a
                href={`https://play.google.com/store/apps/details?id=${app.appId}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              >
                Google Play <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Hero Actions & Score Preview */}
        <div className="flex flex-wrap lg:flex-nowrap items-center gap-4 shrink-0">
          {overallScore !== null && (
            <div className="px-5 py-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Score ASO Geral</span>
              <span
                className={`text-2xl font-black ${
                  overallScore >= 80 ? 'text-emerald-400' : overallScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {overallScore}/100
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncApp}
              disabled={isSyncing}
              title="Re-coleta dados ao vivo na Play Store"
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
              Sincronizar
            </button>

            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className={`w-4 h-4 ${isAuditing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
              Re-auditar
            </button>

            <button
              onClick={() => setIsAddKeywordModalOpen(true)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar Palavra-Chave
            </button>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          onClick={() => setActiveTab('keywords')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'keywords'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Palavras-Chave & Rankings ({keywords.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Auditoria Heurística ASO
        </button>

        <button
          onClick={() => setActiveTab('metadata')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'metadata'
              ? 'border-blue-500 text-blue-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          Metadados & Galeria da Loja
        </button>
      </div>

      {/* Tab 1: Palavras-Chave & Rankings */}
      {activeTab === 'keywords' && (
        <div className="space-y-4">
          {/* Sub Header / Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {['all', 'core', 'brand', 'competitor', 'feature'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-all ${
                    tagFilter === tag
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {tag === 'all' ? 'Todas' : tag}
                </button>
              ))}
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={keywordFilter}
                onChange={(e) => setKeywordFilter(e.target.value)}
                placeholder="Buscar palavra-chave..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Modal / Card de Gráfico de Evolução (se selecionado) */}
          {selectedChartKeyword && (
            <div className="relative animate-in fade-in duration-200">
              <div className="absolute right-3 top-3 z-10">
                <button
                  onClick={() => setSelectedChartKeyword(null)}
                  className="px-2.5 py-1 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  Fechar Gráfico ✕
                </button>
              </div>
              <RankingChart
                keyword={selectedChartKeyword.keyword}
                currentRank={selectedChartKeyword.currentRank}
                bestRank={selectedChartKeyword.bestRank}
                history={selectedChartKeyword.history}
              />
            </div>
          )}

          {/* Tabela de Palavras-Chave */}
          {filteredKeywords.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800">
              <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Nenhuma palavra-chave encontrada</p>
              <p className="text-xs text-slate-500 mt-1">
                Adicione termos de busca para acompanhar a evolução das posições do app nos resultados orgânicos da Google Play.
              </p>
              <button
                onClick={() => setIsAddKeywordModalOpen(true)}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Rastrear Primeira Palavra-Chave
              </button>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Palavra-Chave</th>
                    <th className="px-4 py-3.5">Tag</th>
                    <th className="px-4 py-3.5 text-center">Rank Atual</th>
                    <th className="px-4 py-3.5 text-center">Variação</th>
                    <th className="px-4 py-3.5 text-center">Melhor Rank</th>
                    <th className="px-4 py-3.5">Última Checagem</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredKeywords.map((item) => {
                    const kwText = item.keyword?.keyword || '—';
                    const currentRank = item.currentRank;
                    const previousRank = item.previousRank;
                    const bestRank = item.bestRank;
                    const diff =
                      previousRank && currentRank ? previousRank - currentRank : null;
                    const isChecking = checkingKeywordId === item.id;

                    // Cor do Rank
                    const getRankBadge = (rank: number | null) => {
                      if (!rank) {
                        return (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-800 text-slate-500">
                            &gt; 100
                          </span>
                        );
                      }
                      if (rank <= 3) {
                        return (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            🏆 #{rank}
                          </span>
                        );
                      }
                      if (rank <= 10) {
                        return (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            #{rank}
                          </span>
                        );
                      }
                      if (rank <= 50) {
                        return (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            #{rank}
                          </span>
                        );
                      }
                      return (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          #{rank}
                        </span>
                      );
                    };

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3 font-sans font-bold text-white text-sm">
                          {kwText}
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                            {item.tag || 'core'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{getRankBadge(currentRank)}</td>
                        <td className="px-4 py-3 text-center">
                          {diff !== null ? (
                            diff > 0 ? (
                              <span className="text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                                <TrendingUp className="w-3.5 h-3.5" /> +{diff}
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-rose-400 font-bold flex items-center justify-center gap-0.5">
                                <TrendingDown className="w-3.5 h-3.5" /> {diff}
                              </span>
                            ) : (
                              <span className="text-slate-500 flex items-center justify-center gap-0.5">
                                <Minus className="w-3.5 h-3.5" /> 0
                              </span>
                            )
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-300 font-bold">
                          {bestRank ? `#${bestRank}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-[11px]">
                          {item.lastTrackedAt
                            ? new Date(item.lastTrackedAt).toLocaleDateString('pt-BR')
                            : 'Pendente'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            <button
                              onClick={() => handleCheckKeywordRank(item.id, kwText)}
                              disabled={isChecking}
                              title="Checar posição ao vivo no Google Play"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-blue-400' : ''}`}
                              />
                            </button>
                            <button
                              onClick={() => handleOpenChart(item)}
                              title="Visualizar gráfico histórico de posições"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                            >
                              <LineChart className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleUntrackKeyword(item.keywordId, kwText)}
                              title="Remover palavra-chave"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Auditoria Heurística ASO */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {latestAudit ? (
            <>
              {/* Mostrador Principal */}
              <AuditGauge
                overallScore={latestAudit.overallScore}
                titleScore={latestAudit.titleScore}
                shortDescriptionScore={latestAudit.shortDescriptionScore}
                longDescriptionScore={latestAudit.longDescriptionScore}
                iconScore={latestAudit.iconScore}
                screenshotsScore={latestAudit.screenshotsScore}
                ratingsScore={latestAudit.ratingsScore}
                auditDate={latestAudit.auditDate}
              />

              {/* Seção de Recomendações Acionáveis */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Diagnóstico & Recomendações Acionáveis
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Orientações geradas pelo algoritmo heurístico para maximizar a conversão (CRO) e indexação orgânica.
                    </p>
                  </div>

                  {/* Filtro de Severidade */}
                  <div className="flex items-center gap-1.5 text-xs">
                    {[
                      { id: 'all', label: 'Todas' },
                      { id: 'HIGH', label: 'Críticas' },
                      { id: 'MEDIUM', label: 'Médias' },
                      { id: 'LOW', label: 'Baixas' },
                    ].map((sev) => (
                      <button
                        key={sev.id}
                        onClick={() => setSeverityFilter(sev.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          severityFilter === sev.id
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {sev.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredRecommendations.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-white">Nenhum problema detectado neste nível!</p>
                    <p className="text-xs text-slate-500 mt-1">
                      A listagem da sua loja atende a todas as diretrizes avaliadas para este filtro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecommendations.map((rec: any, idx: number) => {
                      const isHigh = rec.severity === 'HIGH';
                      const isMed = rec.severity === 'MEDIUM';

                      return (
                        <div
                          key={rec.id || idx}
                          className={`p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                            isHigh
                              ? 'bg-rose-500/5 border-rose-500/20'
                              : isMed
                              ? 'bg-amber-500/5 border-amber-500/20'
                              : 'bg-blue-500/5 border-blue-500/20'
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {isHigh ? (
                              <AlertCircle className="w-5 h-5 text-rose-400" />
                            ) : isMed ? (
                              <AlertTriangle className="w-5 h-5 text-amber-400" />
                            ) : (
                              <Info className="w-5 h-5 text-blue-400" />
                            )}
                          </div>

                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 font-mono">
                                {rec.category}
                              </span>
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded font-mono ${
                                  isHigh
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : isMed
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-blue-500/20 text-blue-300'
                                }`}
                              >
                                Prioridade {rec.severity}
                              </span>
                            </div>

                            <p className="text-xs font-bold text-white pt-1">{rec.message}</p>
                            <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                              <strong className="text-blue-400">Ação Recomendada: </strong>
                              {rec.suggestedAction}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Nenhuma auditoria executada ainda</p>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Execute a primeira auditoria heurística para mensurar a qualidade da listagem na loja.
              </p>
              <button
                onClick={handleRunAudit}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg"
              >
                Executar Auditoria Agora
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Metadados & Galeria Visual */}
      {activeTab === 'metadata' && (
        <div className="space-y-6">
          {/* Screenshots Gallery */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-white mb-1">Galeria Visual de Screenshots</h3>
            <p className="text-xs text-slate-400 mb-4">
              Imagens e mockups ativos na página da Google Play Store ({app.metadata?.screenshots?.length || 0} capturas).
            </p>

            {app.metadata?.screenshots?.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-3 pt-1">
                {app.metadata.screenshots.map((url: string, index: number) => (
                  <div
                    key={index}
                    className="shrink-0 w-44 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 hover:border-slate-700 transition-all group"
                  >
                    <img
                      src={url}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="p-2 text-center text-[10px] font-mono text-slate-400 bg-slate-950">
                      Print #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Nenhum screenshot detectado na loja para este app.
              </div>
            )}
          </div>

          {/* Textos da Página da Loja */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Descrição Curta */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">Descrição Curta (Resumo)</h4>
                <span className="text-xs font-mono text-slate-400">
                  {app.metadata?.summary?.length || 0} / 80 chars
                </span>
              </div>
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed min-h-[80px]">
                {app.metadata?.summary || <span className="text-slate-600">Não informado.</span>}
              </div>
            </div>

            {/* Metadados Técnicos */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
              <h4 className="text-sm font-bold text-white">Parâmetros Técnicos na Loja</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Versão do App</span>
                  <span className="font-bold text-white">{app.metadata?.version || 'Varia com dispositivo'}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Android Mínimo</span>
                  <span className="font-bold text-white">{app.metadata?.androidVersionText || '—'}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Tamanho</span>
                  <span className="font-bold text-white">{app.metadata?.size || 'Varia'}</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block uppercase">Última Atualização</span>
                  <span className="font-bold text-white">
                    {app.metadata?.updated
                      ? new Date(app.metadata.updated).toLocaleDateString('pt-BR')
                      : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Descrição Completa */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Descrição Completa</h4>
              <span className="text-xs font-mono text-slate-400">
                {app.metadata?.description?.length || 0} / 4.000 chars
              </span>
            </div>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap font-sans">
              {app.metadata?.description || <span className="text-slate-600">Não informado.</span>}
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar Palavra-Chave */}
      <AddKeywordModal
        isOpen={isAddKeywordModalOpen}
        onClose={() => setIsAddKeywordModalOpen(false)}
        onSuccess={() => {
          showToast('Palavra-chave vinculada e rank inicial verificado!');
          loadAppData();
        }}
        asoAppId={app.id}
        appTitle={app.title}
      />
    </div>
  );
}

