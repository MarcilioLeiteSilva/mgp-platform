'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Smartphone,
  Search,
  Plus,
  RefreshCw,
  ExternalLink,
  Trash2,
  TrendingUp,
  BarChart2,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  Layers,
  Flame,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { AddAppModal } from '@/components/aso/add-app-modal';
import { QueueStatusBadge } from '@/components/aso/queue-status-badge';
import { MarketTrendsPanel } from '@/components/aso/market-trends-panel';

export default function AsoStudioPage() {
  const { currentOrg } = useAuth();

  // State
  const [apps, setApps] = useState<any[]>([]);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'my-apps' | 'competitors' | 'explorer' | 'trends'>('my-apps');

  // Modals & Feedback
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addCompetitorMode, setAddCompetitorMode] = useState(false);
  const [syncingAppId, setSyncingAppId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Explorer State
  const [explorerQuery, setExplorerQuery] = useState('');
  const [explorerResults, setExplorerResults] = useState<any[]>([]);
  const [isExploring, setIsExploring] = useState(false);

  // Carrega aplicativos monitorados e concorrentes da organização
  const fetchApps = useCallback(async () => {
    setIsLoading(true);
    try {
      const [myAppsRes, competitorsRes] = await Promise.all([
        api.get('/aso/apps?isCompetitor=false&limit=100'),
        api.get('/aso/apps?isCompetitor=true&limit=100'),
      ]);

      if (myAppsRes.success) {
        setApps(myAppsRes.data?.data || []);
      }
      if (competitorsRes.success) {
        setCompetitors(competitorsRes.data?.data || []);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao carregar dados do ASO Studio.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentOrg?.id) {
      fetchApps();
    }
  }, [currentOrg?.id, fetchApps]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Disparo em lote de rankings no BullMQ
  const handleDispatchBatchRankings = async () => {
    try {
      const res = await api.post('/aso/sync/dispatch-rankings');
      if (res.success) {
        showToast('Verificação diária de rankings despachada para os workers assíncronos!');
      } else {
        showToast(res.error || 'Falha ao despachar rankings.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro de rede ao despachar tarefas.');
    }
  };

  // Sincronização individual do aplicativo
  const handleSyncApp = async (id: string, title: string) => {
    setSyncingAppId(id);
    try {
      const res = await api.post(`/aso/apps/${id}/sync`);
      if (res.success) {
        showToast(`Metadados e auditoria do app "${title}" atualizados com sucesso!`);
        fetchApps();
      } else {
        showToast(res.error || 'Falha ao sincronizar aplicativo.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro na sincronização.');
    } finally {
      setSyncingAppId(null);
    }
  };

  // Exclusão de aplicativo
  const handleDeleteApp = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente remover o aplicativo "${title}" do monitoramento de ASO?`)) {
      return;
    }
    try {
      const res = await api.delete(`/aso/apps/${id}`);
      if (res.success) {
        showToast(`Aplicativo "${title}" removido com sucesso.`);
        fetchApps();
      } else {
        showToast(res.error || 'Erro ao remover aplicativo.');
      }
    } catch (err: any) {
      showToast(err.message || 'Erro na exclusão.');
    }
  };

  // Busca livre na Play Store
  const handleExplorerSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explorerQuery.trim()) return;
    setIsExploring(true);
    try {
      const res = await api.get(`/aso/scraper/search?term=${encodeURIComponent(explorerQuery)}&country=br&lang=pt&num=15`);
      if (res.success && Array.isArray(res.data)) {
        setExplorerResults(res.data);
      } else {
        setExplorerResults([]);
      }
    } catch (err: any) {
      showToast(err.message || 'Erro na busca da loja.');
    } finally {
      setIsExploring(false);
    }
  };

  // KPIs
  const totalMyApps = apps.length;
  const totalCompetitors = competitors.length;
  const totalKeywords = apps.reduce((acc, a) => acc + (a._count?.appKeywords || 0), 0);

  // Calcula a média de ASO scores dos apps monitorados
  const appsWithScore = apps.filter((a) => a.auditScores && a.auditScores.length > 0);
  const avgAsoScore = appsWithScore.length > 0
    ? Math.round(appsWithScore.reduce((acc, a) => acc + a.auditScores[0].overallScore, 0) / appsWithScore.length)
    : null;

  // Filtragem de apps por texto
  const filteredApps = apps.filter(
    (a) =>
      a.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.appId.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  const filteredCompetitors = competitors.filter(
    (c) =>
      c.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      c.appId.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl border border-blue-400 text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">ASO Studio</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Inteligência de posicionamento na Google Play, auditoria de conversão e benchmarking competitivo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <QueueStatusBadge />

          <button
            onClick={handleDispatchBatchRankings}
            title="Dispara checagem em lote de todos os rankings nas filas de background"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sincronizar Rankings
          </button>

          <button
            onClick={() => {
              setAddCompetitorMode(false);
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Rastrear Novo App
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Apps Monitorados</span>
            <Smartphone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalMyApps}</div>
          <p className="text-[11px] text-slate-500 mt-1">Aplicativos principais da organização</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Concorrentes Rastreando</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalCompetitors}</div>
          <p className="text-[11px] text-slate-500 mt-1">Bases de benchmarking orgânico</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Palavras-Chave Monitoradas</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalKeywords}</div>
          <p className="text-[11px] text-slate-500 mt-1">Termos com checagem diária de ranking</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-1">
            <span>Score ASO Médio</span>
            <BarChart2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-extrabold ${avgAsoScore ? (avgAsoScore >= 80 ? 'text-emerald-400' : avgAsoScore >= 60 ? 'text-amber-400' : 'text-rose-400') : 'text-slate-400'}`}>
              {avgAsoScore ? `${avgAsoScore}/100` : '—'}
            </span>
            {avgAsoScore && (
              <span className="text-[10px] uppercase font-bold text-slate-400">
                {avgAsoScore >= 80 ? 'Excelente' : 'Regular'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Conformidade com heurística Google Play</p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-px">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('my-apps')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'my-apps'
                ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Meus Aplicativos ({totalMyApps})
          </button>
          <button
            onClick={() => setActiveTab('competitors')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'competitors'
                ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Concorrentes ({totalCompetitors})
          </button>
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'explorer'
                ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Search className="w-4 h-4" />
            Explorador da Loja
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === 'trends'
                ? 'border-blue-500 text-blue-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-rose-500" />
            Radar de Tendências & Breakouts
          </button>
        </div>

        {activeTab !== 'explorer' && activeTab !== 'trends' && (
          <div className="relative w-56">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filtrar por nome ou ID..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </div>

      {/* Tab 1: Meus Aplicativos */}
      {activeTab === 'my-apps' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
              <p className="text-sm">Carregando catálogo de aplicativos monitorados...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="p-12 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Nenhum aplicativo cadastrado</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  Adicione o primeiro aplicativo da sua organização para rastrear posições de busca, acompanhar concorrentes e auditar a página da Google Play.
                </p>
              </div>
              <button
                onClick={() => {
                  setAddCompetitorMode(false);
                  setIsAddModalOpen(true);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-blue-500/20 inline-flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Primeiro Aplicativo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApps.map((app) => {
                const latestAudit = app.auditScores?.[0];
                const score = latestAudit?.overallScore ?? null;
                const keywordsCount = app._count?.appKeywords || 0;
                const isSyncing = syncingAppId === app.id;

                return (
                  <div
                    key={app.id}
                    className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl shadow-sm transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start gap-3.5 mb-3">
                        <img
                          src={app.icon || '/placeholder.png'}
                          alt={app.title}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-800 shrink-0 border border-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                            {app.title}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">{app.developer}</p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">{app.appId}</p>
                        </div>
                      </div>

                      {/* Métricas e Tags */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center my-3">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Nota</span>
                          <span className="text-xs font-bold text-amber-400">
                            ★ {app.score ? Number(app.score).toFixed(1) : '—'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Keywords</span>
                          <span className="text-xs font-bold text-white">{keywordsCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Score ASO</span>
                          <span
                            className={`text-xs font-bold ${
                              score
                                ? score >= 80
                                  ? 'text-emerald-400'
                                  : score >= 60
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                                : 'text-slate-500'
                            }`}
                          >
                            {score ? `${score}/100` : 'Pendente'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSyncApp(app.id, app.title)}
                          disabled={isSyncing}
                          title="Sincronizar metadados com a Play Store"
                          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteApp(app.id, app.title)}
                          title="Excluir aplicativo do monitoramento"
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <Link
                        href={`/aso/${app.id}`}
                        className="px-3.5 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-semibold rounded-lg border border-blue-500/20 transition-all flex items-center gap-1"
                      >
                        Painel ASO & Keywords
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Concorrentes */}
      {activeTab === 'competitors' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Benchmarking Competitivo</h3>
              <p className="text-xs text-slate-400">
                Acompanhe o desempenho, pontuação de auditoria e palavras-chave ranqueadas pelos seus principais rivais.
              </p>
            </div>
            <button
              onClick={() => {
                setAddCompetitorMode(true);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar Concorrente
            </button>
          </div>

          {filteredCompetitors.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800">
              <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Nenhum concorrente cadastrado ainda</p>
              <p className="text-xs text-slate-500 mt-1">
                Adicione aplicativos concorrentes para comparar scores de otimização de loja e identificar oportunidades de palavras-chave.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCompetitors.map((comp) => {
                const latestAudit = comp.auditScores?.[0];
                const score = latestAudit?.overallScore ?? null;
                const keywordsCount = comp._count?.appKeywords || 0;

                return (
                  <div
                    key={comp.id}
                    className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start gap-3.5 mb-3">
                        <img
                          src={comp.icon || '/placeholder.png'}
                          alt={comp.title}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-800 shrink-0 border border-indigo-500/30"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white truncate">{comp.title}</h3>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              Rival
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{comp.developer}</p>
                          <p className="text-[11px] text-slate-500 font-mono truncate">{comp.appId}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center my-3">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Nota</span>
                          <span className="text-xs font-bold text-amber-400">★ {comp.score ? Number(comp.score).toFixed(1) : '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Keywords</span>
                          <span className="text-xs font-bold text-white">{keywordsCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase font-mono">Score ASO</span>
                          <span className={`text-xs font-bold ${score && score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {score ? `${score}/100` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={() => handleDeleteApp(comp.id, comp.title)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <Link
                        href={`/aso/${comp.id}`}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1"
                      >
                        Auditoria & Keywords
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Explorador da Google Play */}
      {activeTab === 'explorer' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-white mb-1">Explorador Direto da Google Play Store</h3>
            <p className="text-xs text-slate-400 mb-4">
              Pesquise qualquer aplicativo no ecossistema Android para inspecionar notas, instalações e adicioná-lo diretamente à sua lista de monitoramento ou concorrentes.
            </p>

            <form onSubmit={handleExplorerSearch} className="flex gap-2.5 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={explorerQuery}
                  onChange={(e) => setExplorerQuery(e.target.value)}
                  placeholder="Pesquise por nome, termo de busca ou package ID..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={isExploring || !explorerQuery.trim()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
              >
                {isExploring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Buscar na Loja
              </button>
            </form>
          </div>

          {/* Resultados da Busca no Explorador */}
          {explorerResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {explorerResults.map((item) => (
                <div
                  key={item.appId}
                  className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col justify-between hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-start gap-3 mb-2.5">
                      <img
                        src={item.icon || '/placeholder.png'}
                        alt={item.title}
                        className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700 shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{item.developer}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{item.appId}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs py-2 border-y border-slate-800/80 font-mono text-slate-400">
                      <span className="text-amber-400 font-bold">★ {item.score ? item.score.toFixed(1) : '—'}</span>
                      <span>{item.priceText || (item.free ? 'Gratuito' : 'Pago')}</span>
                    </div>
                  </div>

                  <div className="pt-3 mt-1 flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          await api.post('/aso/apps', {
                            appId: item.appId,
                            isCompetitor: false,
                            country: 'br',
                            lang: 'pt',
                          });
                          showToast(`App "${item.title}" adicionado como aplicativo monitorado!`);
                          fetchApps();
                        } catch (err: any) {
                          showToast(err.message || 'Erro ao adicionar app.');
                        }
                      }}
                      className="flex-1 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-[11px] font-bold rounded-lg border border-blue-500/20 transition-all text-center"
                    >
                      + Meu App
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await api.post('/aso/apps', {
                            appId: item.appId,
                            isCompetitor: true,
                            country: 'br',
                            lang: 'pt',
                          });
                          showToast(`App "${item.title}" adicionado aos concorrentes!`);
                          fetchApps();
                        } catch (err: any) {
                          showToast(err.message || 'Erro ao adicionar concorrente.');
                        }
                      }}
                      className="flex-1 py-1.5 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[11px] font-bold rounded-lg border border-indigo-500/20 transition-all text-center"
                    >
                      + Concorrente
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Radar de Tendências & Breakouts */}
      {activeTab === 'trends' && <MarketTrendsPanel />}

      {/* Modal Adicionar App / Concorrente */}
      <AddAppModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          showToast('Aplicativo registrado com sucesso!');
          fetchApps();
        }}
        existingApps={apps.map((a) => ({ id: a.id, title: a.title, appId: a.appId }))}
        defaultIsCompetitor={addCompetitorMode}
      />
    </div>
  );
}

