'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Server,
  Database,
  HardDrive,
  Users,
  Building2,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Cpu,
  Layers,
  ArrowUpRight,
  Radio,
} from 'lucide-react';
import { api } from '@/lib/api';

interface SystemOverviewData {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  infrastructure: {
    database: { status: string; latencyMs: number; engine: string };
    redis: { status: string; mode: string };
    runtime: {
      nodeVersion: string;
      platform: string;
      uptimeSeconds: number;
      memory: { heapUsedMb: number; heapTotalMb: number; rssMb: number };
    };
  };
  kpis: {
    organizationsCount: number;
    usersCount: number;
    appsCount: number;
    activeSessionsCount: number;
    auditLogsCount: number;
    custodyBalances: {
      advertisingCredits: number;
      exchangeCredits: number;
      publisherEarnings: number;
    };
  };
}

interface QueueInfo {
  name: string;
  description: string;
  status: string;
  waiting: number;
  active: number;
  failed: number;
  processedLastHour: number;
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<SystemOverviewData | null>(null);
  const [queues, setQueues] = useState<QueueInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const [overviewRes, queuesRes] = await Promise.all([
        api.get<SystemOverviewData>('/admin/overview'),
        api.get<{ queues: QueueInfo[] }>('/admin/system/queues'),
      ]);

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      }
      if (queuesRes.success && queuesRes.data?.queues) {
        setQueues(queuesRes.data.queues);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do NOC:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000); // Polling a cada 30s
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Operacional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
              NOC Console v0.1
            </span>
            <span className="text-xs text-slate-400">
              Última sincronização: {overview?.timestamp ? new Date(overview.timestamp).toLocaleTimeString() : '—'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Centro de Operações e Infraestrutura (NOC)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitoramento em tempo real de saúde dos serviços, integridade de dados e auditoria global.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Telemetria
        </button>
      </div>

      {/* 4 Cards de Métricas de Infraestrutura / Runtime */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Database */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-blue-400">PostgreSQL</span>
            <Database className="w-4 h-4 text-blue-400" />
          </div>
          <div className="my-3">
            <p className="text-xs text-slate-400">Latência de Query</p>
            <p className="text-2xl font-black text-white">
              {loading ? '—' : `${overview?.infrastructure?.database?.latencyMs || 0} ms`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{overview?.infrastructure?.database?.status || 'ONLINE'}</span>
          </div>
        </div>

        {/* Card 2: Memory */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-purple-400">Node.js Heap</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-3">
            <p className="text-xs text-slate-400">Memória Utilizada</p>
            <p className="text-2xl font-black text-white">
              {loading ? '—' : `${overview?.infrastructure?.runtime?.memory?.heapUsedMb || 0} MB`}
            </p>
          </div>
          <div className="text-[11px] text-slate-400">
            Total Heap: {overview?.infrastructure?.runtime?.memory?.heapTotalMb || 0} MB
          </div>
        </div>

        {/* Card 3: Uptime */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-amber-400">Disponibilidade</span>
            <Server className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3">
            <p className="text-xs text-slate-400">Tempo Ativo (Uptime)</p>
            <p className="text-2xl font-black text-white">
              {loading ? '—' : formatUptime(overview?.infrastructure?.runtime?.uptimeSeconds || 0)}
            </p>
          </div>
          <div className="text-[11px] text-slate-400">
            Plataforma: {overview?.infrastructure?.runtime?.platform || 'Node.js'}
          </div>
        </div>

        {/* Card 4: Audit Logs */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold tracking-wider text-emerald-400">Auditoria</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-3">
            <p className="text-xs text-slate-400">Eventos Imutáveis</p>
            <p className="text-2xl font-black text-white">
              {loading ? '—' : overview?.kpis?.auditLogsCount || 0}
            </p>
          </div>
          <Link href="/audit-logs" className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1">
            Ver trilha completa &rarr;
          </Link>
        </div>
      </div>

      {/* 4 Cards de Métricas Globais da Rede */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
          Indicadores Globais de Negócio
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Organizações</span>
              <Building2 className="w-4 h-4" />
            </div>
            <p className="text-3xl font-black text-white">{overview?.kpis?.organizationsCount || 0}</p>
            <Link href="/organizations" className="text-xs text-blue-400 hover:underline mt-3 block">
              Gerenciar Organizações &rarr;
            </Link>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Usuários Globais</span>
              <Users className="w-4 h-4" />
            </div>
            <p className="text-3xl font-black text-white">{overview?.kpis?.usersCount || 0}</p>
            <Link href="/users" className="text-xs text-blue-400 hover:underline mt-3 block">
              Gerenciar Usuários &rarr;
            </Link>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Aplicativos na Rede</span>
              <Smartphone className="w-4 h-4" />
            </div>
            <p className="text-3xl font-black text-white">{overview?.kpis?.appsCount || 0}</p>
            <Link href="/apps" className="text-xs text-blue-400 hover:underline mt-3 block">
              Moderar Aplicativos &rarr;
            </Link>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">Sessões Ativas</span>
              <Radio className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-white">{overview?.kpis?.activeSessionsCount || 0}</p>
            <p className="text-xs text-slate-500 mt-3">Sessões simultâneas concorrentes</p>
          </div>
        </div>
      </div>

      {/* Saldos Totais em Custódia (Ledger Consolidado) */}
      <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-2">
          Saldos em Custódia Global da Plataforma (Double-Entry Ledger)
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Totalização agregada de saldos segregados em todas as carteiras ativas no sistema.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-blue-400">Saldo Anunciantes (Advertiser)</span>
            <p className="text-2xl font-black text-white mt-1">
              ${(overview?.kpis?.custodyBalances?.advertisingCredits || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Fundos pré-pagos para campanhas</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-amber-400">Créditos de Troca (Exchange)</span>
            <p className="text-2xl font-black text-white mt-1">
              ${(overview?.kpis?.custodyBalances?.exchangeCredits || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Volume orgânico não-sacável</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-emerald-400">Ganhos Publishers (Payable)</span>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              ${(overview?.kpis?.custodyBalances?.publisherEarnings || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Passivo de repasses pendentes de saque</p>
          </div>
        </div>
      </div>

      {/* Monitor de Filas Assíncronas (BullMQ) */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Monitor de Filas e Processamento em Segundo Plano
            </h3>
            <p className="text-xs text-slate-500">Filas operacionais do ecossistema MGP</p>
          </div>
          <Link
            href="/system"
            className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            Métricas Prometheus &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900/60 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Fila</th>
                <th className="px-6 py-3.5">Função</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Em Espera</th>
                <th className="px-6 py-3.5">Ativos</th>
                <th className="px-6 py-3.5">Falhas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {queues.map((q) => (
                <tr key={q.name} className="hover:bg-slate-900/40">
                  <td className="px-6 py-3.5 font-bold text-white">{q.name}</td>
                  <td className="px-6 py-3.5 font-sans text-slate-400">{q.description}</td>
                  <td className="px-6 py-3.5">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-slate-300">{q.waiting}</td>
                  <td className="px-6 py-3.5 text-blue-400">{q.active}</td>
                  <td className="px-6 py-3.5 text-red-400">{q.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
