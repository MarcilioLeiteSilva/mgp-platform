'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, RefreshCw, Loader2, ShieldAlert, CheckCircle, Ban, Radio } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface UserItem {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  isSuperadmin: boolean;
  createdAt: string;
  _count: {
    memberships: number;
    sessions: number;
  };
  memberships: Array<{
    organization: { id: string; name: string; slug: string };
  }>;
}

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get<UserItem[]>(
        `/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`
      );
      if (res.success && Array.isArray(res.data)) {
        setUsers(res.data);
      } else {
        setUsers([]);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleUserStatus = async (user: UserItem) => {
    const actionLabel = user.isActive ? 'suspender' : 'reativar';
    if (!confirm(`Deseja realmente ${actionLabel} a conta de ${user.email}?`)) return;

    try {
      setUpdatingId(user.id);
      const res = await api.patch(`/admin/users/${user.id}/status`, {
        isActive: !user.isActive,
      });
      if (res.success) {
        await fetchUsers();
      } else {
        alert(res.error || 'Erro ao atualizar usuário.');
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
          <h1 className="text-2xl font-black text-white tracking-tight">Gestão Global de Usuários</h1>
          <p className="text-xs text-slate-400">
            Controle de acessos, suspensão preventiva de contas e auditoria de sessões ativas.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-slate-950 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-900 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Lista
        </button>
      </div>

      {/* Busca */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            fetchUsers();
          }}
          className="flex gap-3 max-w-md"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por e-mail ou nome..."
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
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

      {/* Tabela de Usuários */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
            <p className="text-xs text-slate-400">Carregando usuários...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400">
              <thead className="bg-slate-900/60 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Superadmin</th>
                  <th className="px-6 py-4">Sessões Ativas</th>
                  <th className="px-6 py-4">Organizações</th>
                  <th className="px-6 py-4">Cadastro</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-900/40">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-slate-300 flex items-center justify-center font-bold text-xs border border-slate-800">
                            {u.fullName ? u.fullName[0].toUpperCase() : u.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">
                              {u.fullName || 'Sem nome'}
                              {isCurrent && (
                                <span className="ml-2 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                  Você
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20">
                            <Ban className="w-3 h-3" />
                            Suspenso
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.isSuperadmin ? (
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            Sim
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">Não</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 font-mono">
                          <Radio className="w-3 h-3 text-emerald-400" />
                          <span>{u._count?.sessions || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[11px]">
                        <span className="truncate max-w-[160px] block" title={u.memberships?.map((m) => m.organization.name).join(', ')}>
                          {u.memberships?.length || 0} org(s)
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!isCurrent && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={updatingId === u.id}
                            className={`px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                              u.isActive
                                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            {u.isActive ? 'Suspender' : 'Reativar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
