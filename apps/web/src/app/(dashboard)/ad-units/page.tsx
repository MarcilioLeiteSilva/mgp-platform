'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutGrid,
  Plus,
  Copy,
  Check,
  Code2,
  DollarSign,
  TrendingUp,
  Percent,
  Smartphone,
  Play,
  Pause,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CreateAdUnitModal } from '@/components/ad-units/create-ad-unit-modal';
import { IntegrationCodeModal } from '@/components/ad-units/integration-code-modal';

interface AdUnitItem {
  id: string;
  appId: string;
  name: string;
  format: 'BANNER' | 'NATIVE' | 'INTERSTITIAL' | 'REWARDED';
  placement?: string;
  floorEcpm: number;
  isActive: boolean;
  createdAt: string;
  app?: {
    id: string;
    name: string;
    packageName: string;
    platform: string;
    sdkKey?: string;
  };
}

interface AnalyticsSummary {
  totalAdUnits: number;
  activeAdUnits: number;
  impressionsCount: number;
  clicksCount: number;
  rewardsCount: number;
  ctr: number;
  grossRevenue: number;
  publisherRevenue: number;
  platformFee: number;
  effectiveEcpm: number;
  fillRate: number;
}

export default function AdUnitsPage() {
  const [adUnits, setAdUnits] = useState<AdUnitItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUnitForCode, setSelectedUnitForCode] = useState<AdUnitItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [unitsRes, analyticsRes] = await Promise.all([
        api.get<{ data: AdUnitItem[] }>('/ad-units?limit=100'),
        api.get<{ summary: AnalyticsSummary }>('/ad-units/analytics?period=30d'),
      ]);

      const items = Array.isArray(unitsRes)
        ? unitsRes
        : (unitsRes as any)?.data || (unitsRes as any)?.items || [];
      setAdUnits(items);

      if (analyticsRes && (analyticsRes as any).summary) {
        setAnalytics((analyticsRes as any).summary);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar blocos de anúncios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleStatus = async (unit: AdUnitItem) => {
    try {
      const res = await api.patch(`/ad-units/${unit.id}`, {
        isActive: !unit.isActive,
      });
      if (res && res.error) {
        alert(`Erro ao alterar status: ${res.error}`);
        return;
      }
      await loadData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleDelete = async (unit: AdUnitItem) => {
    if (!confirm(`Deseja realmente excluir a Ad Unit "${unit.name}"?`)) return;
    try {
      const res = await api.delete(`/ad-units/${unit.id}`);
      if (res && res.error) {
        alert(`Erro ao excluir: ${res.error}`);
        return;
      }
      await loadData();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const filteredUnits = useMemo(() => {
    return adUnits.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.placement && u.placement.toLowerCase().includes(search.toLowerCase())) ||
        (u.app && u.app.name.toLowerCase().includes(search.toLowerCase()));

      const matchesFormat = formatFilter === 'ALL' || u.format === formatFilter;
      return matchesSearch && matchesFormat;
    });
  }, [adUnits, search, formatFilter]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Blocos de Anúncios (Ad Units)</h1>
              <p className="text-sm text-slate-400">
                Configure o inventário de monetização dos seus aplicativos e integre via SDK
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Bloco de Anúncios</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Receita do Publisher</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            R$ {(analytics?.publisherRevenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">70% de participação líquida</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Blocos Ativos</span>
            <LayoutGrid className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {adUnits.filter((u) => u.isActive).length} / {adUnits.length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Aptos a servir impressões</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">eCPM Efetivo</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            R$ {(analytics?.effectiveEcpm ?? 0).toFixed(2)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Rendimento por mil impressões</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Fill Rate RTB</span>
            <Percent className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {(analytics?.fillRate ?? 98.5).toFixed(1)}%
          </div>
          <p className="text-xs text-slate-500 mt-1">Taxa de atendimento do leilão</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar bloco ou app..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'BANNER', 'NATIVE', 'INTERSTITIAL', 'REWARDED'].map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormatFilter(fmt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                formatFilter === fmt
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {fmt === 'ALL'
                ? 'Todos os Formatos'
                : fmt === 'BANNER'
                ? 'Banners'
                : fmt === 'NATIVE'
                ? 'Nativos'
                : fmt === 'INTERSTITIAL'
                ? 'Interstitiais'
                : 'Rewarded (Vídeo)'}
            </button>
          ))}
        </div>
      </div>

      {/* List of Ad Units */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando blocos de anúncios...</p>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
          <LayoutGrid className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Nenhum bloco de anúncios encontrado</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Crie blocos de anúncios para integrar ao seu app Android e começar a monetizar com leilões RTB em tempo real.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Bloco
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUnits.map((unit) => {
            const formatBadgeStyle =
              unit.format === 'BANNER'
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                : unit.format === 'NATIVE'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : unit.format === 'INTERSTITIAL'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

            return (
              <div
                key={unit.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Info Esquerda */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${formatBadgeStyle}`}
                    >
                      {unit.format}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        unit.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-700/40 text-slate-400 border border-slate-600/30'
                      }`}
                    >
                      {unit.isActive ? 'Ativo' : 'Pausado'}
                    </span>

                    {unit.placement && (
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-mono border border-slate-700/60">
                        tag: {unit.placement}
                      </span>
                    )}

                    {unit.app && (
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                        {unit.app.name}
                        <span className="text-slate-500 text-[11px]">({unit.app.packageName})</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white truncate">{unit.name}</h3>

                  {/* ID com 1-Click Copy */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-xs text-slate-500 font-mono">adUnitId:</span>
                    <button
                      onClick={() => handleCopyId(unit.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-xs font-mono text-slate-300 transition-colors"
                      title="Clique para copiar o ID deste bloco"
                    >
                      <span>{unit.id}</span>
                      {copiedId === unit.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* RTB Floor Price */}
                <div className="lg:border-l lg:border-r border-slate-800/80 lg:px-6">
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                    Floor eCPM (Reserva)
                  </span>
                  <span className="text-base font-bold text-white">
                    R$ {Number(unit.floorEcpm).toFixed(2)}
                  </span>
                  <span className="text-[10px] text-slate-500 block">lance mínimo no leilão</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  <button
                    onClick={() => handleToggleStatus(unit)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      unit.isActive
                        ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                    }`}
                  >
                    {unit.isActive ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>Pausar</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Ativar</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setSelectedUnitForCode(unit)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-white transition-colors border border-slate-700/80 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Code2 className="w-4 h-4" />
                    <span>Integração SDK</span>
                  </button>

                  <button
                    onClick={() => handleDelete(unit)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700/80"
                    title="Excluir Bloco de Anúncios"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação */}
      <CreateAdUnitModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => loadData()}
      />

      {/* Modal de Código de Integração */}
      <IntegrationCodeModal
        isOpen={!!selectedUnitForCode}
        adUnit={selectedUnitForCode}
        onClose={() => setSelectedUnitForCode(null)}
      />
    </div>
  );
}

