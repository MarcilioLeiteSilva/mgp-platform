'use client';

import React, { useEffect, useState } from 'react';
import { Smartphone, Search, RefreshCw, Loader2, CheckCircle2, AlertTriangle, ShieldX } from 'lucide-react';
import { api } from '@/lib/api';

interface AppItem {
  id: string;
  name: string;
  packageName: string;
  platform: string;
  sdkKey: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    adUnits: number;
  };
}

export default function AdminAppsPage() {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchApps = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get<AppItem[]>(`/admin/apps?${params.toString()}`);
      if (res.success && Array.isArray(res.data)) {
        setApps(res.data);
      } else {
        setApps([]);
      }
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, [statusFilter]);

  const handleUpdateStatus = async (appId: string, newStatus: string) => {
    try {
      setUpdatingId(appId);
      const res = await api.patch(`/admin/apps/${appId}/status`, {
        status: newStatus,
      });
      if (res.success) {
        await fetchApps();
      } else {
        alert(res.error || 'Erro ao alterar status do app.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro inesperado.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Moderação Global de Aplicativos</h1>
          <p className="text-xs text-slate-400">
            Aprovação, suspensão e inspeção de chaves SDK de todos os apps da rede MGP.
          </p>
        </div>

        <button
          onClick={fetchApps}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchApps();
          }}
          className="flex-1 flex gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou package name..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            Buscar
          </button>
        </form>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
        >
          <option value="">Todos os Status</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING">PENDING</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {/* Tabela de Apps */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
            <p className="text-xs text-slate-400">Carregando aplicativos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-900/60 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Aplicativo / Package</th>
                  <th className="px-6 py-4">Organização</th>
                  <th className="px-6 py-4">Plataforma</th>
                  <th className="px-6 py-4">SDK Key</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {apps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-900/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-slate-300 flex items-center justify-center border border-slate-800">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{app.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">{app.packageName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 font-medium">
                      {app.organization.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {app.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400">
                      <span className="bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        {app.sdkKey.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {app.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          ACTIVE
                        </span>
                      ) : app.status === 'PENDING' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" />
                          PENDING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                          <ShieldX className="w-3 h-3" />
                          SUSPENDED
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {app.status !== 'ACTIVE' ? (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'ACTIVE')}
                          disabled={updatingId === app.id}
                          className="px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-[11px] font-semibold transition-colors"
                        >
                          Aprovar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(app.id, 'SUSPENDED')}
                          disabled={updatingId === app.id}
                          className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-[11px] font-semibold transition-colors"
                        >
                          Suspender
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
