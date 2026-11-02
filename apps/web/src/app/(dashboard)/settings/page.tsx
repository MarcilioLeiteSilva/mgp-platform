'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Shield,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  Activity,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const { user, refreshData } = useAuth();

  // Estados de Perfil
  const [fullName, setFullName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Estados de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);

    try {
      setProfileLoading(true);
      const res = await api.patch('/users/me', {
        fullName,
      });

      if (res.success) {
        setProfileSuccess('Perfil atualizado com sucesso.');
        await refreshData();
      } else {
        setProfileError(res.error || 'Erro ao atualizar perfil.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Erro inesperado.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('A nova senha deve possuir no mínimo 8 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação da senha não confere.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await api.post('/users/me/change-password', {
        currentPassword,
        newPassword,
      });

      if (res.success) {
        setPasswordSuccess(
          'Senha alterada com sucesso! Todas as outras sessões ativas foram revogadas por segurança.'
        );
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        await refreshData();
      } else {
        setPasswordError(res.error || 'Erro ao alterar senha. Verifique sua senha atual.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Erro inesperado.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Configurações da Conta
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Gerencie suas informações pessoais, credenciais de acesso e segurança da conta.
        </p>
      </div>

      {/* Dados do Perfil */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          Perfil Pessoal
        </h2>
        <p className="text-xs text-slate-500 mb-6">Atualize suas informações de exibição na plataforma</p>

        {profileSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              E-mail Corporativo
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="mt-1 block w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-500 bg-slate-50 text-sm"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              O e-mail é o identificador único da sua conta e não pode ser alterado diretamente.
            </span>
          </div>

          <button
            type="submit"
            disabled={profileLoading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            {profileLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Alterações
          </button>
        </form>
      </div>

      {/* Alteração de Senha */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-slate-700" />
          Segurança e Senha de Acesso
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Ao alterar sua senha, todas as outras sessões ativas serão revogadas automaticamente.
        </p>

        {passwordSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Senha Atual
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••"
              className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Nova Senha (Mínimo 8 caracteres)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Confirmar Nova Senha
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="mt-1 block w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2"
          >
            {passwordLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Atualizar Senha
          </button>
        </form>
      </div>

      {/* Sessões e Informações do Sistema */}
      <div className="bg-slate-100 rounded-2xl p-6 border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          Informações da Conta e Sessão
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Identificador de Usuário (UUID)</span>
            <span className="font-mono text-slate-800 truncate block">{user?.id}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Papel de Sistema (Global)</span>
            <span className="font-semibold uppercase text-slate-800">{user?.role}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Sessões Ativas no Banco</span>
            <span className="font-semibold text-slate-800">{user?.activeSessionsCount || 1} sessão(ões)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

