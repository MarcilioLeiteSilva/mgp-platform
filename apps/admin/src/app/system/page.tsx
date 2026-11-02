'use client';

import React, { useEffect, useState } from 'react';
import { Cpu, Database, HardDrive, RefreshCw, Loader2, Copy, Check, Radio } from 'lucide-react';
import { api } from '@/lib/api';

interface QueueItem {
  name: string;
  description: string;
  status: string;
  waiting: number;
  active: number;
  failed: number;
  processedLastHour: number;
}

export default function AdminSystemPage() {
  const [queues, setQueues] = useState<QueueItem[]>([]);
  const [prometheusText, setPrometheusText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const [queuesRes, metricsRes] = await Promise.all([
        api.get<{ queues: QueueItem[] }>('/admin/system/queues'),
        fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'https://mgp-production-mgp-api.gtalg3.easypanel.host/api/v1'}/admin/metrics`,
          {
            headers: {
              Authorization: `Bearer ${api.getToken()}`,
            },
          }
        ).then((res) => res.text()),
      ]);

      if (queuesRes.success && queuesRes.data?.queues) {
        setQueues(queuesRes.data.queues);
      }
      if (metricsRes) {
        setPrometheusText(metricsRes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const handleCopyMetrics = () => {
    navigator.clipboard.writeText(prometheusText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Infraestrutura, Filas & Telemetria</h1>
          <p className="text-xs text-slate-400">
            Monitoramento de processamento em segundo plano (BullMQ) e exportador de métricas Prometheus.
          </p>
        </div>

        <button
          onClick={fetchSystemData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Telemetria
        </button>
      </div>

      {/* Grid das 4 Filas do Sistema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {queues.map((q) => (
          <div key={q.name} className="bg-slate-950 p-6 rounded-2xl border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  {q.name}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {q.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">{q.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-center font-mono text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Em Espera</span>
                <span className="text-sm font-bold text-white mt-1 block">{q.waiting}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-blue-400 block">Ativos</span>
                <span className="text-sm font-bold text-blue-400 mt-1 block">{q.active}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] uppercase font-bold text-red-400 block">Falhas</span>
                <span className="text-sm font-bold text-red-400 mt-1 block">{q.failed}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Exportador Prometheus */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-red-500" />
              Feed de Métricas Prometheus (`GET /admin/metrics`)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Formato aberto padrão exportável para Grafana, Datadog ou Prometheus Scraper.
            </p>
          </div>

          <button
            onClick={handleCopyMetrics}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Métricas</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 overflow-x-auto max-h-80">
          <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
            {prometheusText || 'Carregando feed Prometheus...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
