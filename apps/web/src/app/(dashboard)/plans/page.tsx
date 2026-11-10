'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Zap,
  Sparkles,
  ShieldCheck,
  Check,
  RefreshCw,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingUp,
  Cpu,
  Users,
  Smartphone,
  Search,
  Key,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  PlanDetailsDto,
  PlanTier,
  BillingCycle,
  CurrentPlanResponseDto,
} from '@mgp/contracts';

export default function PlansPage() {
  const [plans, setPlans] = useState<PlanDetailsDto[]>([]);
  const [currentPlanData, setCurrentPlanData] = useState<CurrentPlanResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [selectedPlanToChange, setSelectedPlanToChange] = useState<PlanDetailsDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [plansRes, currentRes] = await Promise.all([
        api.get<PlanDetailsDto[]>('/api/v1/plans'),
        api.get<CurrentPlanResponseDto>('/api/v1/plans/current'),
      ]);

      const plansData = plansRes?.data || (plansRes as any);
      const currentData = currentRes?.data || (currentRes as any);

      if (Array.isArray(plansData)) setPlans(plansData);
      if (currentData && currentData.plan) {
        setCurrentPlanData(currentData);
        if (currentData.subscription?.billingCycle) {
          setBillingCycle(currentData.subscription.billingCycle);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Falha ao carregar planos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubscribe = async () => {
    if (!selectedPlanToChange) return;

    try {
      setIsSubmitting(true);
      const res = await api.post('/api/v1/plans/subscribe', {
        planTier: selectedPlanToChange.tier,
        billingCycle,
      });

      const data = res?.data || (res as any);
      showToast(data?.message || `Plano ${selectedPlanToChange.name} ativado com sucesso!`);
      setSelectedPlanToChange(null);
      await loadData();
    } catch (err: any) {
      showToast('Erro ao alterar plano: ' + (err.message || 'Falha na requisição'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Tem certeza que deseja cancelar a renovação automática da assinatura? Você continuará com acesso aos recursos até o fim do período vigente.')) {
      return;
    }

    try {
      await api.post('/api/v1/plans/cancel', {});
      showToast('Renovação da assinatura cancelada com sucesso.');
      await loadData();
    } catch (err: any) {
      showToast('Erro ao cancelar: ' + (err.message || 'Falha na operação'));
    }
  };

  const currentTier = currentPlanData?.subscription?.planTier || 'FREE';
  const usage = currentPlanData?.usage;
  const isCanceled = !!currentPlanData?.subscription?.canceledAt;

  return (
    <div className="p-8 space-y-10 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 border border-blue-500/40 text-white rounded-xl shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Planos & Assinatura SaaS</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerencie o nível de serviço da sua organização, quotas de recursos e recursos de inteligência avançada.
              </p>
            </div>
          </div>
        </div>

        {/* Billing Cycle Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl shrink-0">
          <button
            onClick={() => setBillingCycle('MONTHLY')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              billingCycle === 'MONTHLY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Faturamento Mensal
          </button>
          <button
            onClick={() => setBillingCycle('YEARLY')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              billingCycle === 'YEARLY'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Faturamento Anual
            <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
              20% OFF
            </span>
          </button>
        </div>
      </div>

      {/* Current Quotas and Usage Bar */}
      {usage && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs text-slate-400 font-semibold block">Seu Nível Atual</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-black text-white">{currentPlanData?.plan?.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isCanceled
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {isCanceled ? 'Renovação Cancelada' : 'Ativo'}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-500 block">
                {isCanceled ? 'Acesso válido até' : 'Próxima Renovação'}
              </span>
              <span className="text-xs font-mono text-slate-300 font-semibold">
                {currentPlanData?.subscription?.currentPeriodEnd
                  ? new Date(currentPlanData.subscription.currentPeriodEnd).toLocaleDateString('pt-BR')
                  : '—'}
              </span>
              {currentTier !== 'FREE' && !isCanceled && (
                <button
                  onClick={handleCancelSubscription}
                  className="block text-[11px] text-rose-400 hover:text-rose-300 mt-1 sm:ml-auto"
                >
                  Cancelar renovação
                </button>
              )}
            </div>
          </div>

          {/* Usage Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  Apps Monitorados
                </span>
                <span className="font-mono text-white font-bold">
                  {usage.appsUsed} / {usage.appsLimit}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((usage.appsUsed / usage.appsLimit) * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Search className="w-3.5 h-3.5 text-purple-400" />
                  Keywords Rastreadas
                </span>
                <span className="font-mono text-white font-bold">
                  {usage.keywordsUsed} / {usage.keywordsLimit}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((usage.keywordsUsed / usage.keywordsLimit) * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  API Calls (Mês)
                </span>
                <span className="font-mono text-white font-bold">
                  {usage.apiCallsUsed.toLocaleString('pt-BR')} / {usage.apiCallsLimit.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((usage.apiCallsUsed / usage.apiCallsLimit) * 100))}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  Membros da Equipe
                </span>
                <span className="font-mono text-white font-bold">
                  {usage.membersUsed} / {usage.membersLimit}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.round((usage.membersUsed / usage.membersLimit) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans Pricing Grid */}
      {isLoading ? (
        <div className="p-16 text-center">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Carregando Planos & Benefícios...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((p) => {
            const isCurrent = p.tier === currentTier;
            const price = billingCycle === 'YEARLY' ? p.priceYearlyMonthlyBrl : p.priceMonthlyBrl;

            return (
              <div
                key={p.tier}
                className={`relative bg-slate-900 rounded-3xl p-6 flex flex-col justify-between transition-all ${
                  p.isPopular
                    ? 'border-2 border-purple-500/70 shadow-xl shadow-purple-500/10'
                    : isCurrent
                    ? 'border-2 border-blue-500/60 shadow-lg'
                    : 'border border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Popular Badge */}
                {p.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-md">
                    Mais Popular
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{p.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.description}</p>
                  </div>

                  {/* Price */}
                  <div className="pt-2 pb-1 border-b border-slate-800/80">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">
                        R$ {price}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ mês</span>
                    </div>
                    {billingCycle === 'YEARLY' && p.priceYearlyTotalBrl > 0 && (
                      <p className="text-[11px] text-emerald-400 font-mono mt-0.5">
                        Faturado anualmente: R$ {p.priceYearlyTotalBrl}
                      </p>
                    )}
                  </div>

                  {/* Limits Highlights */}
                  <div className="space-y-2 text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Recursos & Limites:
                    </span>
                    <ul className="space-y-2">
                      {p.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span className="text-xs leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Action CTA Button */}
                <div className="pt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold border border-slate-700 cursor-default"
                    >
                      Seu Plano Atual
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedPlanToChange(p)}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md ${
                        p.isPopular
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      <span>{p.priceMonthlyBrl > (plans.find((x) => x.tier === currentTier)?.priceMonthlyBrl || 0) ? 'Fazer Upgrade' : 'Mudar para este Plano'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedPlanToChange && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 animate-scale-up">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirmar Alteração de Plano</h3>
                <p className="text-xs text-slate-400">Mudança para o {selectedPlanToChange.name}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Plano Selecionado:</span>
                <strong className="text-white">{selectedPlanToChange.name}</strong>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Ciclo de Faturamento:</span>
                <span className="font-semibold text-blue-400">
                  {billingCycle === 'YEARLY' ? 'Anual (20% OFF)' : 'Mensal'}
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Valor:</span>
                <strong className="text-white text-sm">
                  R$ {billingCycle === 'YEARLY' ? selectedPlanToChange.priceYearlyMonthlyBrl : selectedPlanToChange.priceMonthlyBrl} / mês
                </strong>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              O novo limite de aplicativos, palavras-chave e chamadas de API será ativado imediatamente para a sua organização.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedPlanToChange(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
              >
                {isSubmitting ? 'Ativando...' : 'Confirmar & Ativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

