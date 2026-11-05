'use client';

import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export function QueueStatusBadge() {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/aso/sync/metrics');
      if (res.success && res.data) {
        setMetrics(res.data);
      }
    } catch {
      // Falha silenciosa para não travar a UI
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  if (!metrics) return null;

  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          {metrics.active > 0 ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          )}
        </span>
        <span className="text-slate-400 text-[11px] font-mono">Workers ASO:</span>
      </div>

      <div className="flex items-center gap-2 text-[11px] font-mono">
        {metrics.active > 0 ? (
          <span className="text-blue-400 font-bold">{metrics.active} ativo(s)</span>
        ) : (
          <span className="text-emerald-400 font-medium">Ocioso</span>
        )}
        {metrics.waiting > 0 && (
          <span className="text-amber-400">({metrics.waiting} na fila)</span>
        )}
      </div>

      <button
        onClick={fetchMetrics}
        disabled={isLoading}
        title="Atualizar telemetria de workers"
        className="text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
      >
        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

