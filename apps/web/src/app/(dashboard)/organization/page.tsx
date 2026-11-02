'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Building,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface MemberItem {
  id: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER' | 'ANALYST';
  createdAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

interface InvitationItem {
  id: string;
  email: string;
  role: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

export default function OrganizationPage() {
  const { currentOrg, user, refreshData } = useAuth();

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Estados de Convite
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER' | 'ANALYST'>('MEMBER');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  // Estados de Edição da Organização
  const [orgName, setOrgName] = useState('');
  const [updatingOrg, setUpdatingOrg] = useState(false);
  const [orgMessage, setOrgMessage] = useState<string | null>(null);

  const isOwnerOrAdmin = currentOrg?.role === 'OWNER' || currentOrg?.role === 'ADMIN';

  const fetchData = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      setOrgName(currentOrg.name);

      const [membersRes, invitesRes] = await Promise.all([
        api.get<MemberItem[]>(`/organizations/${currentOrg.id}/members`),
        isOwnerOrAdmin
          ? api.get<InvitationItem[]>(`/organizations/${currentOrg.id}/invitations`)
          : Promise.resolve({ success: true, data: [] }),
      ]);

      if (membersRes.success && Array.isArray(membersRes.data)) {
        setMembers(membersRes.data);
      }
      if (invitesRes.success && Array.isArray(invitesRes.data)) {
        setInvitations(invitesRes.data.filter((i) => i.status === 'PENDING'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg?.id]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccess(null);

    if (!inviteEmail) {
      setInviteError('Informe o e-mail do destinatário.');
      return;
    }

    try {
      setSendingInvite(true);
      const res = await api.post(`/organizations/${currentOrg?.id}/invitations`, {
        email: inviteEmail,
        role: inviteRole,
      });

      if (res.success) {
        setInviteSuccess(`Convite enviado com sucesso para ${inviteEmail}!`);
        setInviteEmail('');
        await fetchData();
      } else {
        setInviteError(res.error || 'Erro ao enviar convite.');
      }
    } catch (err: any) {
      setInviteError(err.message || 'Erro inesperado.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (invitationId: string) => {
    if (!confirm('Deseja realmente revogar este convite?')) return;
    try {
      const res = await api.delete(`/organizations/${currentOrg?.id}/invitations/${invitationId}`);
      if (res.success) {
        await fetchData();
      } else {
        alert(res.error || 'Erro ao revogar convite.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro inesperado.');
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: string) => {
    try {
      const res = await api.patch(`/organizations/${currentOrg?.id}/members/${memberId}`, {
        role: newRole,
      });
      if (res.success) {
        await fetchData();
      } else {
        alert(res.error || 'Erro ao alterar papel.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar.');
    }
  };

  const handleRemoveMember = async (memberId: string, memberEmail: string) => {
    if (!confirm(`Tem certeza que deseja remover ${memberEmail} da organização?`)) return;
    try {
      const res = await api.delete(`/organizations/${currentOrg?.id}/members/${memberId}`);
      if (res.success) {
        await fetchData();
      } else {
        alert(res.error || 'Erro ao remover membro.');
      }
    } catch (err: any) {
      alert(err.message || 'Erro inesperado.');
    }
  };

  const handleCopyInviteLink = (token: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/invitations/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleUpdateOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrgMessage(null);
    try {
      setUpdatingOrg(true);
      const res = await api.patch(`/organizations/${currentOrg?.id}`, {
        name: orgName,
      });
      if (res.success) {
        setOrgMessage('Nome da organização atualizado com sucesso.');
        await refreshData();
      } else {
        setOrgMessage(res.error || 'Erro ao atualizar organização.');
      }
    } catch (err: any) {
      setOrgMessage(err.message || 'Erro inesperado.');
    } finally {
      setUpdatingOrg(false);
    }
  };

  const handleSetDefault = async () => {
    try {
      const res = await api.post(`/organizations/${currentOrg?.id}/default`);
      if (res.success) {
        alert('Organização definida como padrão!');
        await refreshData();
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao definir como padrão.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Organização & Membros
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie dados cadastrais, membros da equipe e convites com controle de acesso RBAC.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Recarregar
        </button>
      </div>

      {/* Dados da Organização */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Building className="w-4 h-4 text-slate-500" />
          Configurações da Organização
        </h2>
        <p className="text-xs text-slate-500 mb-4">Informações cadastrais e tenant padrão</p>

        {orgMessage && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700">
            {orgMessage}
          </div>
        )}

        <form onSubmit={handleUpdateOrgName} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            disabled={!isOwnerOrAdmin}
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
            placeholder="Nome da organização"
          />
          {isOwnerOrAdmin && (
            <button
              type="submit"
              disabled={updatingOrg}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              {updatingOrg ? 'Salvando...' : 'Atualizar Nome'}
            </button>
          )}
          <button
            type="button"
            onClick={handleSetDefault}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Tornar Padrão
          </button>
        </form>
      </div>

      {/* Convite de Novo Membro (Apenas Owner/Admin) */}
      {isOwnerOrAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-600" />
            Convidar Novo Membro
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Envie um convite com papel RBAC específico para um novo integrante da equipe.
          </p>

          {inviteError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{inviteError}</span>
            </div>
          )}

          {inviteSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{inviteSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <div className="sm:col-span-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colaborador@empresa.com"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={inviteRole}
                onChange={(e: any) => setInviteRole(e.target.value)}
                className="px-3 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="MANAGER">MANAGER</option>
                <option value="MEMBER">MEMBER</option>
                <option value="ANALYST">ANALYST</option>
              </select>

              <button
                type="submit"
                disabled={sendingInvite}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                {sendingInvite ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Convidar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Convites Pendentes */}
      {isOwnerOrAdmin && invitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Convites Pendentes</h2>
          <div className="divide-y divide-slate-100">
            {invitations.map((inv) => (
              <div key={inv.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{inv.email}</p>
                  <p className="text-xs text-slate-400">
                    Papel: <span className="font-semibold text-slate-600 uppercase">{inv.role}</span> • Expira em:{' '}
                    {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleCopyInviteLink(inv.token)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {copiedToken === inv.token ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-semibold">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Link</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                    title="Revogar Convite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela de Membros */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Membros da Organização</h2>
            <p className="text-xs text-slate-500">Integrantes com acesso aos dados e recursos deste tenant</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {members.length} membro(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-[11px] uppercase font-semibold text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Papel (RBAC)</th>
                <th className="px-6 py-4">Membro Desde</th>
                {isOwnerOrAdmin && <th className="px-6 py-4 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((m) => {
                const isCurrentUser = m.userId === user?.id;
                const isMemberOwner = m.role === 'OWNER';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {m.user.fullName ? m.user.fullName[0].toUpperCase() : m.user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {m.user.fullName || 'Sem nome'}
                            {isCurrentUser && (
                              <span className="ml-2 text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium border border-blue-200">
                                Você
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {isOwnerOrAdmin && !isMemberOwner ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="MEMBER">MEMBER</option>
                          <option value="ANALYST">ANALYST</option>
                        </select>
                      ) : (
                        <span
                          className={`text-xs font-bold uppercase px-2.5 py-1 rounded-lg ${
                            isMemberOwner
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    {isOwnerOrAdmin && (
                      <td className="px-6 py-4 text-right">
                        {!isMemberOwner && !isCurrentUser && (
                          <button
                            onClick={() => handleRemoveMember(m.id, m.user.email)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Remover membro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
