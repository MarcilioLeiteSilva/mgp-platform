'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
  Sliders,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '@/lib/api';

export interface CampaignRecommendationItem {
  id: string;
  campaignId: string;
  type: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  suggestedAction: string;
  expectedImpact: string;
  actionPayload: any;
  status: 'PENDING' | 'APPLIED' | 'DISMISSED';
  createdAt: string;
  campaign?: {
    id: string;
    name: string;
    bidAmount: number | string;
    dailyBudget: number | string;
    biddingStrategy: string;
    pacingMode: string;
  };
}

interface RecommendationsCardProps {
  recommendations: CampaignRecommendationItem[];
  onRefresh: () => void;
  onOpenSmartBidding?: (campaignId: string) => void;
}

export function RecommendationsCard({
  recommendations,
  onRefresh,
  onOpenSmartBidding,
}: RecommendationsCardProps) {
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  const pendingRecommendations = recommendations.filter((r) => r.status === 'PENDING');

  const handleGenerate = async () => {
    setIsGenerating(true);
    setFeedback(null);
    try {
      const res = await api.post<{ generatedCount: number; message: string }>(
        '/recommendations/generate',
        {},
      );
      setFeedback({
        type: 'success',
        message: (res as any)?.message || 'Análise heurística de campanhas concluída.',
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha ao analisar campanhas.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async (rec: CampaignRecommendationItem) => {
    setApplyingId(rec.id);
    setFeedback(null);
    try {
      await api.post(`/recommendations/${rec.id}/apply`, {});
      setFeedback({
        type: 'success',
        message: `Otimização "${rec.title}" aplicada com sucesso na campanha!`,
      });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao aplicar otimização na campanha.',
      });
    } finally {
      setApplyingId(null);
    }
  };

  const handleDismiss = async (rec: CampaignRecommendationItem) => {
    setDismissingId(rec.id);
    setFeedback(null);
    try {
      await api.post(`/recommendations/${rec.id}/dismiss`, { reason: 'Dismissed by user' });
      onRefresh();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao descartar recomendação.',
      });
    } finally {
      setDismissingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900/80 p-6 shadow-xl backdrop-blur-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Motor de Otimizações & Smart Bidding
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AI & Heurística
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Recomendações contínuas de lances, pacing horária e alocação de orçamento para máxima entrega no leilão RTB
            </p>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-600 text-white font-medium text-xs transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          <span>{isGenerating ? 'Analisando Leilões...' : 'Analisar Oportunidades'}</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`text-xs p-3 rounded-xl border flex items-center justify-between gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-60 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Lista de Recomendações */}
      {pendingRecommendations.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
          <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-300">
            Todas as campanhas estão operando com ritmo de lances otimizado
          </p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1">
            O algoritmo monitora dinamicamente win rates, consumo diário e curvas de conversão para sugerir ajustes de alto impacto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingRecommendations.map((rec) => {
            const isApplying = applyingId === rec.id;
            const isDismissing = dismissingId === rec.id;

            return (
              <div
                key={rec.id}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          rec.priority === 'HIGH'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : rec.priority === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {rec.priority === 'HIGH'
                          ? 'Alta Prioridade'
                          : rec.priority === 'MEDIUM'
                          ? 'Média Prioridade'
                          : 'Oportunidade'}
                      </span>

                      <span className="text-[9px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                        {rec.type}
                      </span>
                    </div>

                    {rec.campaign && (
                      <span className="text-[11px] font-semibold text-slate-300 truncate max-w-[130px]">
                        {rec.campaign.name}
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-white">{rec.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    {rec.message}
                  </p>

                  <div className="mt-2.5 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-start gap-2">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <span className="font-semibold text-indigo-200">Impacto Estimado: </span>
                      <span className="text-indigo-300">{rec.expectedImpact}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleDismiss(rec)}
                    disabled={isDismissing || isApplying}
                    className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
                  >
                    {isDismissing ? 'Descartando...' : 'Ignorar'}
                  </button>

                  <div className="flex items-center gap-2">
                    {onOpenSmartBidding && rec.campaignId && (
                      <button
                        onClick={() => onOpenSmartBidding(rec.campaignId)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>Ajustar</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleApply(rec)}
                      disabled={isApplying || isDismissing}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-500/20 disabled:opacity-50"
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Aplicando...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          <span>Aplicar Otimização</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

