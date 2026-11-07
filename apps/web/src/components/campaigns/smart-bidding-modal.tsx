'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Sliders,
  Sparkles,
  TrendingUp,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';

interface SmartBiddingModalProps {
  campaignId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SmartBiddingModal({
  campaignId,
  isOpen,
  onClose,
  onSuccess,
}: SmartBiddingModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [biddingStrategy, setBiddingStrategy] = useState<string>('MANUAL');
  const [pacingMode, setPacingMode] = useState<string>('EVEN');
  const [targetCpa, setTargetCpa] = useState<string>('');
  const [autoOptimize, setAutoOptimize] = useState(true);

  // Simulação e Telemetria de Pacing
  const [simulationData, setSimulationData] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (isOpen && campaignId) {
      loadSimulation();
    }
  }, [isOpen, campaignId]);

  const loadSimulation = async () => {
    if (!campaignId) return;
    setLoading(true);
    setFeedback(null);
    try {
      const res = await api.post<any>(
        `/recommendations/campaigns/${campaignId}/simulate-bid`,
        { targetMetric: 'IMPRESSIONS' },
      );
      const data = (res as any)?.data || res;
      setSimulationData(data);

      if (data?.campaign) {
        setBiddingStrategy(data.campaign.biddingStrategy || 'MANUAL');
        setPacingMode(data.campaign.pacingMode || 'EVEN');
        if (data.campaign.targetCpa) {
          setTargetCpa(String(data.campaign.targetCpa));
        }
      }
    } catch (err: any) {
      console.error('Falha ao carregar simulação de lances:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const payload: any = {
        biddingStrategy,
        pacingMode,
        autoOptimize,
      };

      if (biddingStrategy === 'TARGET_CPA' && targetCpa) {
        payload.targetCpa = parseFloat(targetCpa);
      }

      await api.patch(`/recommendations/campaigns/${campaignId}/bidding-strategy`, payload);
      setFeedback({
        type: 'success',
        message: 'Estratégia de lances e pacing atualizados com sucesso!',
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao atualizar estratégia de lances.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const pacing = simulationData?.pacing;
  const simulation = simulationData?.simulation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Lances Inteligentes & Pacing Horário
              </h2>
              <p className="text-xs text-slate-400">
                {simulationData?.campaign?.name
                  ? `Configuração da campanha "${simulationData.campaign.name}"`
                  : 'Otimização algorítmica de lances RTB'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`text-xs p-3.5 rounded-xl border flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-xs text-slate-400">Calculando simulação de entrega e curvas horárias...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Monitor de Pacing */}
            {pacing && (
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Ritmo de Entrega Diário (Pacing às {pacing.currentHour}:00h)
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      pacing.pacingStatus === 'ON_TRACK'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : pacing.pacingStatus === 'AHEAD'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}
                  >
                    {pacing.pacingStatus === 'ON_TRACK'
                      ? 'No Ritmo Previsto'
                      : pacing.pacingStatus === 'AHEAD'
                      ? 'Consumo Acelerado'
                      : 'Consumo Retido'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400">Gasto Atual</p>
                    <p className="text-sm font-bold text-white mt-0.5">R$ {pacing.actualSpend.toFixed(2)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400">Esperado para a Hora</p>
                    <p className="text-sm font-bold text-slate-300 mt-0.5">R$ {pacing.expectedSpend.toFixed(2)}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <p className="text-[10px] text-slate-400">Multiplicador de Lance</p>
                    <p className="text-sm font-bold text-indigo-400 mt-0.5">{pacing.pacingMultiplier}x</p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  💡 {pacing.recommendedAction}
                </p>
              </div>
            )}

            {/* Configurações de Estratégia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Estratégia de Lances (Bidding Strategy)
                </label>
                <select
                  value={biddingStrategy}
                  onChange={(e) => setBiddingStrategy(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MANUAL">Manual Bid (Lance Fixo)</option>
                  <option value="SMART_PACING">Smart Pacing (Otimização Automática)</option>
                  <option value="TARGET_CPA">Target CPA (Custo por Aquisição Alvo)</option>
                  <option value="MAX_IMPRESSIONS">Max Impressions (Volume Máximo)</option>
                  <option value="MAX_CLICKS">Max Clicks (Maximizar Cliques)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Modo de Pacing do Orçamento
                </label>
                <select
                  value={pacingMode}
                  onChange={(e) => setPacingMode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="EVEN">Uniforme (Distribuir pelas 24 horas)</option>
                  <option value="SMART_DYNAMIC">Dinâmico (Curvas de pico de conversão)</option>
                  <option value="ACCELERATED">Acelerado (Gasto imediato sem trava)</option>
                </select>
              </div>
            </div>

            {biddingStrategy === 'TARGET_CPA' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Meta de CPA (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.10"
                  value={targetCpa}
                  onChange={(e) => setTargetCpa(e.target.value)}
                  placeholder="Ex: 4.50"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Simulação de Curva de Lances */}
            {simulation && (
              <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    Curva Preditiva de Lances RTB
                  </span>
                  <span className="text-[10px] text-indigo-400 font-semibold">
                    Lance Ótimo Sugerido: R$ {simulation.suggestedOptimalBid.toFixed(2)}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-indigo-500/20 text-slate-400">
                        <th className="py-1 px-2">Variação</th>
                        <th className="py-1 px-2">Lance Simulado</th>
                        <th className="py-1 px-2">Win Rate Est.</th>
                        <th className="py-1 px-2 text-right">Proj. Impressões</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {simulation.points.map((pt: any) => {
                        const isOptimal = pt.simulatedBid === simulation.suggestedOptimalBid;
                        return (
                          <tr
                            key={pt.bidVariationPct}
                            className={isOptimal ? 'bg-indigo-600/20 text-indigo-200 font-bold' : 'text-slate-300'}
                          >
                            <td className="py-1.5 px-2">
                              {pt.bidVariationPct > 0 ? `+${pt.bidVariationPct}%` : `${pt.bidVariationPct}%`}
                              {isOptimal && ' (Ótimo)'}
                            </td>
                            <td className="py-1.5 px-2 font-mono">R$ {pt.simulatedBid.toFixed(2)}</td>
                            <td className="py-1.5 px-2">{(pt.estimatedWinRate * 100).toFixed(1)}%</td>
                            <td className="py-1.5 px-2 text-right font-mono">
                              {pt.projectedImpressions.toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Toggle de Auto-Otimização */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Auto-Otimização Contínua</p>
                  <p className="text-[11px] text-slate-400">
                    Ajustar multiplicadores de lance dinamicamente de acordo com o tráfego horário.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoOptimize}
                onChange={(e) => setAutoOptimize(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-800"
              />
            </div>

            {/* Botões */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Salvar Estratégia</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
