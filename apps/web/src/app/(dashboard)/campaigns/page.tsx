'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Trash2,
  Image as ImageIcon,
  DollarSign,
  TrendingUp,
  Globe,
  Sliders,
  AlertCircle,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CreateCampaignModal } from '@/components/campaigns/create-campaign-modal';
import { CreativesModal } from '@/components/campaigns/creatives-modal';
import {
  RecommendationsCard,
  CampaignRecommendationItem,
} from '@/components/campaigns/recommendations-card';
import { SmartBiddingModal } from '@/components/campaigns/smart-bidding-modal';

interface CampaignItem {
  id: string;
  organizationId: string;
  name: string;
  type: 'PAID' | 'CROSS_PROMO' | 'HOUSE';
  billingModel: 'CPM' | 'CPC';
  bidAmount: number;
  dailyBudget: number;
  totalBudget: number;
  spentAmount: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  targetCountry?: string;
  targetCategories?: string;
  frequencyCapPerHour: number;
  priorityTier: number;
  startDate?: string;
  endDate?: string;
  creatives?: any[];
  _count?: {
    creatives: number;
  };
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modais
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeCreativesCampaign, setActiveCreativesCampaign] = useState<{ id: string; name: string } | null>(null);
  const [activeBiddingCampaignId, setActiveBiddingCampaignId] = useState<string | null>(null);

  // Recomendações de Otimização & Smart Bidding
  const [recommendations, setRecommendations] = useState<CampaignRecommendationItem[]>([]);

  const loadRecommendations = async () => {
    try {
      const res = await api.get<{ data: CampaignRecommendationItem[] }>(
        '/recommendations?status=PENDING&limit=10',
      );
      const data = (res as any)?.data || (res as any)?.items || res;
      setRecommendations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Falha ao carregar recomendações de campanhas:', err);
    }
  };

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ items: CampaignItem[]; total: number }>('/campaigns');
      if (res && res.data && Array.isArray(res.data.items)) {
        setCampaigns(res.data.items);
      } else if (res && Array.isArray((res as any).items)) {
        setCampaigns((res as any).items);
      } else if (Array.isArray(res)) {
        setCampaigns(res);
      } else {
        setCampaigns([]);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar campanhas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
    loadRecommendations();
  }, []);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const total = campaigns.length;
    const active = campaigns.filter((c) => c.status === 'ACTIVE').length;
    const totalBudget = campaigns.reduce((acc, c) => acc + (c.totalBudget || 0), 0);
    const totalSpent = campaigns.reduce((acc, c) => acc + (c.spentAmount || 0), 0);
    return { total, active, totalBudget, totalSpent };
  }, [campaigns]);

  // Lista filtrada
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  // Alternar status da campanha
  const handleToggleStatus = async (camp: CampaignItem) => {
    const nextStatus = camp.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await api.patch(`/campaigns/${camp.id}/status`, {
        status: nextStatus,
        reason: `Alterado pelo usuário no painel para ${nextStatus}`,
      });

      if (res && res.error) {
        alert(`Não foi possível alterar status: ${res.error}`);
        return;
      }

      await loadCampaigns();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  // Excluir campanha
  const handleDelete = async (campaignId: string) => {
    if (!confirm('Deseja realmente excluir esta campanha? Ela não poderá mais ser reativada.')) return;
    try {
      const res = await api.delete(`/campaigns/${campaignId}`);
      if (res && res.error) {
        alert(`Erro ao excluir: ${res.error}`);
        return;
      }
      await loadCampaigns();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Campanhas Publicitárias</h1>
              <p className="text-sm text-slate-400">
                Gestão de lances RTB, criativos multi-formato e segmentação de audiência
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Campanha</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total de Campanhas</span>
            <Megaphone className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{metrics.total}</div>
          <p className="text-xs text-slate-500 mt-1">Cadastradas no tenant</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Campanhas Ativas</span>
            <Play className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{metrics.active}</div>
          <p className="text-xs text-slate-500 mt-1">Concorrendo em leilões RTB</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Orçamento Contratado</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            R$ {metrics.totalBudget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Teto acumulado</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gasto Realizado</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            R$ {metrics.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 mt-1">Debitado via Ledger Contábil</p>
        </div>
      </div>

      {/* Motor de Recomendações & Smart Bidding (Fase 26) */}
      <RecommendationsCard
        recommendations={recommendations}
        onRefresh={() => loadRecommendations()}
        onOpenSmartBidding={(id) => setActiveBiddingCampaignId(id)}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar campanha por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'PAUSED', 'DRAFT', 'COMPLETED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st === 'ALL'
                ? 'Todas'
                : st === 'ACTIVE'
                ? 'Ativas'
                : st === 'PAUSED'
                ? 'Pausadas'
                : st === 'DRAFT'
                ? 'Rascunhos'
                : 'Concluídas'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Campaign List / Table */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando campanhas...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
          <Megaphone className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">Nenhuma campanha encontrada</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Crie sua primeira campanha para começar a veicular anúncios no ecossistema e participar dos leilões RTB.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Campanha
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((camp) => {
            const creativesCount = camp.creatives?.length || camp._count?.creatives || 0;
            const progressPct = camp.totalBudget > 0
              ? Math.min(100, Math.round(((camp.spentAmount || 0) / camp.totalBudget) * 100))
              : 0;

            return (
              <div
                key={camp.id}
                className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Left Info */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        camp.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : camp.status === 'PAUSED'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : camp.status === 'DRAFT'
                          ? 'bg-slate-700/40 text-slate-300 border border-slate-600/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {camp.status}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                      {camp.type}
                    </span>

                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] font-semibold border border-indigo-500/20">
                      {camp.billingModel}
                    </span>

                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      {camp.targetCountry || 'BR'}
                    </span>

                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5" />
                      Freq: {camp.frequencyCapPerHour}/h
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white truncate">{camp.name}</h3>

                  {/* Budget & Spent Bar */}
                  <div className="max-w-md space-y-1">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>
                        Gasto: <strong className="text-amber-400">R$ {(camp.spentAmount || 0).toFixed(2)}</strong>
                      </span>
                      <span>
                        Total: <strong>R$ {camp.totalBudget.toFixed(2)}</strong> ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-emerald-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Middle RTB Values */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 lg:border-l lg:border-r border-slate-800/80 lg:px-6">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Lance Máximo
                    </span>
                    <span className="text-base font-bold text-white">
                      R$ {camp.bidAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">por {camp.billingModel}</span>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Orçamento Diário
                    </span>
                    <span className="text-base font-bold text-slate-300">
                      R$ {camp.dailyBudget.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-500 block">limite / dia</span>
                  </div>

                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold block">
                      Criativos
                    </span>
                    <button
                      onClick={() => setActiveCreativesCampaign({ id: camp.id, name: camp.name })}
                      className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-bold text-sm mt-0.5"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>{creativesCount} peças</span>
                    </button>
                    <span className="text-[10px] text-slate-500 block">gerenciar</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  <button
                    onClick={() => handleToggleStatus(camp)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      camp.status === 'ACTIVE'
                        ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
                    }`}
                  >
                    {camp.status === 'ACTIVE' ? (
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
                    onClick={() => setActiveCreativesCampaign({ id: camp.id, name: camp.name })}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/80"
                    title="Gerenciar Criativos"
                  >
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                  </button>

                  <button
                    onClick={() => setActiveBiddingCampaignId(camp.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-400 transition-colors border border-slate-700/80"
                    title="Lances Inteligentes & Pacing"
                  >
                    <Sliders className="w-4 h-4" />
                  </button>

                  {camp.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleDelete(camp.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700/80"
                      title="Excluir Campanha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação de Campanha */}
      <CreateCampaignModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => loadCampaigns()}
      />

      {/* Modal de Gestão de Criativos */}
      {activeCreativesCampaign && (
        <CreativesModal
          isOpen={true}
          campaignId={activeCreativesCampaign.id}
          campaignName={activeCreativesCampaign.name}
          onClose={() => setActiveCreativesCampaign(null)}
          onUpdated={() => loadCampaigns()}
        />
      )}

      {/* Modal de Lances Inteligentes & Pacing */}
      <SmartBiddingModal
        campaignId={activeBiddingCampaignId}
        isOpen={!!activeBiddingCampaignId}
        onClose={() => setActiveBiddingCampaignId(null)}
        onSuccess={() => {
          loadCampaigns();
          loadRecommendations();
        }}
      />
    </div>
  );
}

