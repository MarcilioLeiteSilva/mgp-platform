'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Flame,
  Search,
  Sparkles,
  ExternalLink,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Bell,
  ArrowUpRight,
  ShieldAlert,
  BarChart3,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  BreakoutAppDto,
  CategoryTrendSummaryDto,
  TrendingKeywordDto,
  TrendAlertDto,
} from '@mgp/contracts';

const CATEGORIES = [
  { id: 'FINANCE', label: 'Finanças' },
  { id: 'GAME', label: 'Jogos' },
  { id: 'SHOPPING', label: 'Compras & E-commerce' },
  { id: 'PRODUCTIVITY', label: 'Produtividade' },
  { id: 'TOOLS', label: 'Ferramentas' },
  { id: 'SOCIAL', label: 'Redes Sociais' },
];

export function MarketTrendsPanel() {
  const [selectedCategory, setSelectedCategory] = useState<string>('FINANCE');
  const [trendSummary, setTrendSummary] = useState<CategoryTrendSummaryDto | null>(null);
  const [breakouts, setBreakouts] = useState<BreakoutAppDto[]>([]);
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeywordDto[]>([]);
  const [alerts, setAlerts] = useState<TrendAlertDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [addingAppId, setAddingAppId] = useState<string | null>(null);

  const fetchTrendsData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [trendRes, breakoutsRes, keywordsRes, alertsRes] = await Promise.all([
        api.get<CategoryTrendSummaryDto>(`/api/v1/aso/trends/categories/${selectedCategory}?country=BR`),
        api.get<BreakoutAppDto[]>(`/api/v1/aso/trends/breakouts?category=${selectedCategory}&country=BR&limit=15`),
        api.get<TrendingKeywordDto[]>(`/api/v1/aso/trends/keywords?category=${selectedCategory}&country=BR`),
        api.get<TrendAlertDto[]>('/api/v1/aso/trends/alerts?unreadOnly=false'),
      ]);

      const trendData = trendRes?.data || (trendRes as any);
      const breakoutsData = breakoutsRes?.data || (breakoutsRes as any);
      const keywordsData = keywordsRes?.data || (keywordsRes as any);
      const alertsData = alertsRes?.data || (alertsRes as any);

      if (trendData) setTrendSummary(trendData);
      if (Array.isArray(breakoutsData)) setBreakouts(breakoutsData);
      if (Array.isArray(keywordsData)) setTrendingKeywords(keywordsData);
      if (Array.isArray(alertsData)) setAlerts(alertsData);
    } catch (err: any) {
      console.error('Falha ao carregar tendências:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchTrendsData();
  }, [fetchTrendsData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTrendsData();
    setIsRefreshing(false);
    setToastMessage('Radar de tendências atualizado!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleTrackAsCompetitor = async (app: BreakoutAppDto) => {
    try {
      setAddingAppId(app.appId);
      await api.post('/api/v1/aso/apps', {
        appId: app.appId,
        country: 'br',
        lang: 'pt-BR',
        isCompetitor: true,
      });
      setToastMessage(`"${app.title}" adicionado como concorrente com sucesso!`);
      await fetchTrendsData();
    } catch (err: any) {
      setToastMessage('Aviso: ' + (err.message || 'Falha ao adicionar aplicativo'));
    } finally {
      setAddingAppId(null);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await api.patch(`/api/v1/aso/trends/alerts/${alertId}/read`, {});
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)));
    } catch (err: any) {
      console.error('Erro ao marcar alerta:', err);
    }
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('pt-BR').format(num);

  const getScoreBadgeColor = (score: number) => {
    if (score >= 85) return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (score >= 75) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-slate-900 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header com Categorias e Ações */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2.5">
              <Flame className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-white">Radar de Tendências & Breakouts de Mercado</h2>
              <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold">
                Tempo Real
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Monitore concorrentes em ascensão rápida, saltos anormais de ranking e novas demandas de palavras-chave.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            <span>Atualizar Radar</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Strip */}
      {trendSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-medium block mb-1">Índice de Crescimento Setorial</span>
              <span className="text-xl font-bold font-mono text-emerald-400">
                +{trendSummary.categoryGrowthIndex}% (7d)
              </span>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-medium block mb-1">Apps Analisados no Radar</span>
              <span className="text-xl font-bold font-mono text-white">
                {trendSummary.totalAppsAnalyzed} aplicativos
              </span>
            </div>
            <Layers className="w-5 h-5 text-blue-400" />
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <span className="text-slate-400 text-xs font-medium block mb-1">Mercado / Localidade</span>
              <span className="text-xl font-bold font-mono text-cyan-400">
                Google Play ({trendSummary.country})
              </span>
            </div>
            <BarChart3 className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
      )}

      {/* Main Grid: Breakout Apps & Alerts Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Breakout Apps Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Aplicativos em Ascensão Acelerada (Breakouts)</h3>
              </div>
              <span className="text-xs text-slate-400">Ordenado por Breakout Score</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                <span>Processando tração de mercado...</span>
              </div>
            ) : breakouts.length === 0 ? (
              <div className="py-10 text-center text-slate-500 text-xs">
                Nenhum breakout detectado nesta categoria no momento.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {breakouts.map((app) => (
                  <div
                    key={app.appId}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={app.icon}
                        alt={app.title}
                        className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 shrink-0 object-cover"
                        onError={(e) => {
                          (e.target as any).src = 'https://placehold.co/44x44/1e293b/94a3b8?text=App';
                        }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-xs truncate">{app.title}</h4>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${getScoreBadgeColor(
                              app.breakoutScore,
                            )}`}
                          >
                            Score {app.breakoutScore}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {app.developer} · <span className="text-slate-500">{app.genre}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                          <span className="text-white font-semibold">Rank #{app.currentRank}</span>
                          {app.rankDelta > 0 && (
                            <span className="text-emerald-400 flex items-center font-bold">
                              ▲ +{app.rankDelta} posições
                            </span>
                          )}
                          <span className="text-slate-600">·</span>
                          <span>~{formatNumber(app.estimatedDailyDownloads)} dl/dia</span>
                          {app.growthPercentage7d > 0 && (
                            <span className="text-emerald-400 font-semibold">
                              (+{app.growthPercentage7d}% 7d)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => handleTrackAsCompetitor(app)}
                        disabled={app.isMonitoredByOrganization || addingAppId === app.appId}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          app.isMonitoredByOrganization
                            ? 'bg-slate-800 text-slate-500 cursor-default'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{app.isMonitoredByOrganization ? 'Monitorado' : 'Monitorar'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Trending Keywords */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-white text-sm">Palavras-Chave em Alta Demanda no Segmento</h3>
              </div>
              <span className="text-xs text-slate-400">Oportunidades de Ranqueamento</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {trendingKeywords.map((kw) => (
                <div
                  key={kw.keyword}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-white block">"{kw.keyword}"</span>
                    <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                      Volume: {kw.searchVolume}/100 · Dificuldade: {kw.difficulty}/100
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono block text-slate-500">Oportunidade</span>
                    <span className="text-xs font-bold font-mono text-cyan-400">
                      {kw.opportunityScore}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Trend Alerts Feed */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-white text-sm">Alertas de Oportunidade</h3>
              </div>
              <span className="text-xs font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                {alerts.filter((a) => !a.isRead).length} novos
              </span>
            </div>

            {alerts.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Nenhum alerta pendente no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-xl border transition-all text-xs ${
                      alert.isRead
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        : 'bg-slate-950 border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-white leading-tight">{alert.title}</span>
                      <span
                        className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                          alert.severity === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </div>

                    <p className="text-slate-400 text-[11px] leading-relaxed mt-1.5">
                      {alert.message}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-500 font-mono">
                      <span>{new Date(alert.createdAt).toLocaleDateString('pt-BR')}</span>
                      {!alert.isRead && (
                        <button
                          onClick={() => handleMarkAlertRead(alert.id)}
                          className="text-blue-400 hover:text-blue-300 font-semibold"
                        >
                          Marcar como lido
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

