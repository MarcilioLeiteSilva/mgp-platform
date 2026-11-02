'use client';

import React, { useEffect, useState } from 'react';
import { Building2, Search, CheckCircle, XCircle, RefreshCw, Loader2, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

interface OrgItem {
  id: string;
  name: string;
  slug: string;
  documentCnpjCpf?: string | null;
  planTier: string;
  isVerified: boolean;
  createdAt: string;
  _count: {
    memberships: number;
    apps: number;
    campaigns: number;
  };
  wallet?: {
    accounts: Array<{ type: string; cachedBalance: number | string }>;
  };
}

export default function AdminOrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrgItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const res = await api.get<OrgItem[]>(
        `/admin/organizations${search ? `?search=${encodeURIComponent(search)}` : ''}`
      );
      if (res.success && Array.isArray(res.data)) {
        setOrganizations(res.data);
      } else {
        setOrganizations([]);
      }
    } catch {
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleToggleVerified = async (org: OrgItem) => {
    try {
      setUpdatingId(org.id);
      const res = await api.patch(`/admin/organizations/${org.id}/status`, {
        isVerified: !org.isVerified,
      });
      if (res.success) {
        await fetchOrganizations();
      } else {
        alert(res.error || 'Erro ao atualizar verificação.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro inesperado.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleChangePlan = async (orgId: string, planTier: string) => {
    try {
      setUpdatingId(orgId);
      const res = await api.patch(`/admin/organizations/${orgId}/status`, {
        planTier,
      });
      if (res.success) {
        await fetchOrganizations();
      } else {
        alert(res.error || 'Erro ao alterar plano.');
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
          <h1 className="text-2xl font-black text-white tracking-tight">Gestão Global de Organizações</h1>
          <p className="text-xs text-slate-400">
            Moderação cadastral, verificação corporativa e planos de serviço de todos os tenants.
          </p>
        </div>

        <button
          onClick={fetchOrganizations}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchOrganizations();
          }}
          className="flex gap-3 max-w-md"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou slug..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Tabela de Organizações */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
            <p className="text-xs text-slate-400">Carregando organizações...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-900/60 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Organização / Slug</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Verificação</th>
                  <th className="px-6 py-4">Membros</th>
                  <th className="px-6 py-4">Apps</th>
                  <th className="px-6 py-4">Data de Cadastro</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-900/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-900 text-blue-400 flex items-center justify-center border border-slate-800">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm">{org.name}</p>
                          <p className="text-[11px] font-mono text-slate-500">/{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={org.planTier}
                        disabled={updatingId === org.id}
                        onChange={(e) => handleChangePlan(org.id, e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500"
                      >
                        <option value="FREE">FREE</option>
                        <option value="PRO">PRO</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {org.isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" />
                          Verificada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="w-3 h-3" />
                          Pendente
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono">{org._count?.memberships || 0}</td>
                    <td className="px-6 py-4 font-mono">{org._count?.apps || 0}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(org.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleVerified(org)}
                        disabled={updatingId === org.id}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-[11px] font-semibold text-slate-300 transition-colors"
                      >
                        {org.isVerified ? 'Desverificar' : 'Aprovar Verificação'}
                      </button>
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
