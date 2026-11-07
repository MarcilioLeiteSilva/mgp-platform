'use client';

import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  RefreshCw,
  Loader2,
  DollarSign,
  TrendingDown,
  Layers,
  ArrowRight,
  Sliders,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import {
  IncidentDetailsModal,
  FraudIncidentItem,
} from '@/components/antifraud/incident-details-modal';
import { SimulateInspectionModal } from '@/components/antifraud/simulate-inspection-modal';

interface FraudMetrics {
  period: string;
  totalEventsAnalyzed: number;
  totalIncidents: number;
  ivtRatePct: number;
  totalBlockedAmount: number;
  breakdown: {
    givtCount: number;
    sivtCount: number;
    givtPercentage: number;
    sivtPercentage: number;
  };
  severity: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
  topVectors: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export default function FraudControlPage() {
  const { currentOrg } = useAuth();
  const [metrics, setMetrics] = useState<FraudMetrics | null>(null);
  const [incidents, setIncidents] = useState<FraudIncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'24h' | '7d' | '30d'>('7d');

  // Modais
  const [selectedIncident, setSelectedIncident] = useState<FraudIncidentItem | null>(null);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [metricsRes, incidentsRes] = await Promise.all([
        api.get<FraudMetrics>(`/fraud/overview?period=${period}`),
        api.get<{ data: FraudIncidentItem[] }>('/fraud/incidents?limit=25'),
      ]);

      const mData = (metricsRes as any)?.data || metricsRes;
      if (mData) setMetrics(mData);

      const iData = (incidentsRes as any)?.data || (incidentsRes as any)?.items || [];
      setIncidents(Array.isArray(iData) ? iData : []);
    } catch (err) {
      console.error('Falha ao carregar painel antifraude:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg?.id, period]);

  const ivtRate = metrics?.ivtRatePct || 0.0;
  const isHealthyRate = ivtRate < 2.0; // Padrão IAB de compliance < 2.0%

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Controle de Fraudes & Tráfego Inválido (IVT)
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  GIVT & SIVT Gatekeeper
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Auditoria forense em tempo real, proteção contra Click Injection, Click Spamming e estorno contábil (Chargebacks)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Seletor de Período */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            {(['24h', '7d', '30d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  period === p ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsSimulateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-semibold text-xs transition-colors shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Simulador IVT</span>
          </button>

          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de IVT */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Taxa de IVT Global</span>
            {isHealthyRate ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold ${isHealthyRate ? 'text-emerald-400' : 'text-rose-400'}`}>
              {loading ? '...' : `${ivtRate.toFixed(2)}%`}
            </span>
            <span className="text-[10px] font-bold uppercase text-slate-500">
              {isHealthyRate ? 'Em Conformidade MRC' : 'Atenção Operacional'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Limite seguro da indústria: &lt; 2.0%</p>
        </div>

        {/* Incidentes Detectados */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Incidentes de Fraude</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '...' : metrics?.totalIncidents.toLocaleString('pt-BR') || '0'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metrics?.severity.CRITICAL || 0} críticos • {metrics?.severity.HIGH || 0} altos
          </p>
        </div>

        {/* Impacto Financeiro Protegido */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Capital Protegido</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">
            {loading ? '...' : `R$ ${(metrics?.totalBlockedAmount || 0).toFixed(2)}`}
          </div>
          <p className="text-xs text-slate-500 mt-1">Economizado ou estornado via Ledger</p>
        </div>

        {/* Total Inspecionado */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Eventos Inspecionados</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '...' : metrics?.totalEventsAnalyzed.toLocaleString('pt-BR') || '0'}
          </div>
          <p className="text-xs text-slate-500 mt-1">Janela de análise ({period})</p>
        </div>
      </div>

      {/* Distribuição GIVT vs SIVT e Principais Vetores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: GIVT vs SIVT */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Classificação Normativa (GIVT vs SIVT)</h3>
            <p className="text-xs text-slate-400">Padrão Media Rating Council (MRC) e IAB</p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>GIVT (General Invalid Traffic - Bots conhecidos, Emuladores, Datacenters)</span>
                <span className="font-bold">{metrics?.breakdown.givtPercentage || 0}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${metrics?.breakdown.givtPercentage || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>SIVT (Sophisticated Invalid Traffic - Click Injection, Click Spamming, Ad Stacking)</span>
                <span className="font-bold">{metrics?.breakdown.sivtPercentage || 0}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all"
                  style={{ width: `${metrics?.breakdown.sivtPercentage || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Principais Vetores */}
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-white">Principais Vetores de Ataque Detectados</h3>
            <p className="text-xs text-slate-400">Incidentes categorizados por método de abuso</p>
          </div>

          {metrics?.topVectors.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">Nenhum vetor anômalo identificado no período.</p>
          ) : (
            <div className="space-y-2">
              {metrics?.topVectors.slice(0, 4).map((v) => (
                <div key={v.category} className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-800/40">
                  <span className="font-mono text-slate-300">{v.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">{v.count} casos</span>
                    <span className="font-bold text-rose-400">{v.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Incidentes em Tempo Real */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Log de Incidentes de Tráfego Inválido (IVT)</h3>
            <p className="text-xs text-slate-400">Registro compulsório para auditoria forense e estornos</p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Total: {incidents.length} incidentes
          </span>
        </div>

        {incidents.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">Nenhum incidente de fraude registrado</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
              O gatekeeper antifraude analisa 100% dos eventos de clique e impressão contra ataques em tempo real.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Data/Hora</th>
                  <th className="py-2.5 px-3">Categoria IVT</th>
                  <th className="py-2.5 px-3">Severidade</th>
                  <th className="py-2.5 px-3">Origem / App</th>
                  <th className="py-2.5 px-3 text-right">Impacto</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {incidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(inc.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-slate-200">
                      {inc.category}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          inc.severity === 'CRITICAL'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : inc.severity === 'HIGH'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        }`}
                      >
                        {inc.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {inc.app?.name || inc.sourceIp || 'Externo'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-rose-400">
                      R$ {Number(inc.impactAmount).toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          inc.status === 'CONFIRMED'
                            ? 'bg-rose-500/10 text-rose-300'
                            : inc.status === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : inc.status === 'DISMISSED'
                            ? 'bg-slate-700/40 text-slate-400'
                            : 'bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {inc.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedIncident(inc)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[11px] transition-colors border border-slate-700/60"
                      >
                        Inspecionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais */}
      <IncidentDetailsModal
        incident={selectedIncident}
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onSuccess={() => fetchData()}
      />

      <SimulateInspectionModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}

