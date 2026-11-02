'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Repeat,
  DollarSign,
  Smartphone,
  Users,
  Activity,
  Plus,
  ArrowUpRight,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface WalletAccount {
  id: string;
  type: 'ADVERTISING_CREDITS' | 'EXCHANGE_CREDITS' | 'PUBLISHER_EARNINGS';
  balance: string | number;
  currency: string;
}

interface AppItem {
  id: string;
  name: string;
  packageName: string;
  platform: string;
  sdkKey: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const { currentOrg, user } = useAuth();
  const [walletAccounts, setWalletAccounts] = useState<WalletAccount[]>([]);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [membersCount, setMembersCount] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      if (!currentOrg?.id) return;
      try {
        setLoading(true);
        const [orgRes, appsRes, membersRes] = await Promise.all([
          api.get<{ wallet?: { balances?: WalletAccount[] } }>(`/organizations/${currentOrg.id}`),
          api.get<AppItem[]>(`/apps?organizationId=${currentOrg.id}`),
          api.get<any[]>(`/organizations/${currentOrg.id}/members`),
        ]);

        if (orgRes.success && orgRes.data?.wallet?.balances) {
          setWalletAccounts(orgRes.data.wallet.balances);
        } else {
          setWalletAccounts([]);
        }

        if (appsRes.success && Array.isArray(appsRes.data)) {
          setApps(appsRes.data);
        } else {
          setApps([]);
        }

        if (membersRes.success && Array.isArray(membersRes.data)) {
          setMembersCount(membersRes.data.length);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [currentOrg?.id]);

  const getBalance = (type: WalletAccount['type']) => {
    const acc = walletAccounts.find((a) => a.type === type);
    return acc ? Number(acc.balance) : 0;
  };

  const adBalance = getBalance('ADVERTISING_CREDITS');
  const exchangeBalance = getBalance('EXCHANGE_CREDITS');
  const publisherBalance = getBalance('PUBLISHER_EARNINGS');

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {currentOrg?.role}
            </span>
            <span className="text-slate-400 text-xs">Tenant: {currentOrg?.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Olá, {user?.fullName || user?.email.split('@')[0]}!
          </h1>
          <p className="mt-1 text-slate-300 text-sm max-w-xl">
            Bem-vindo ao centro de comando do Mobile Growth Platform. Monitore saldo segregado, gerencie seus apps e acompanhe o crescimento da sua rede.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/apps"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            Novo Aplicativo
          </Link>
          <Link
            href="/wallet"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all"
          >
            <ArrowUpRight className="w-4 h-4" />
            Extrato Contábil
          </Link>
        </div>
      </div>

      {/* 3 Cartões das Contas Contábeis Segregadas (Ledger) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Contas Contábeis da Organização</h2>
          <span className="text-xs text-slate-500 font-medium">
            Segregação Contábil Estrita (Zero Cross-Subsidization)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Saldo Publicitário */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                Advertiser
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500">Saldo Publicitário</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                `$${adBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Destinado a veiculação de campanhas</span>
              <Link href="/wallet" className="text-blue-600 font-semibold hover:underline">
                Detalhes &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2: Saldo de Troca */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                Exchange Network
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Repeat className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500">Saldo de Troca de Tráfego</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                `$${exchangeBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Créditos não-sacáveis de troca</span>
              <Link href="/wallet" className="text-amber-600 font-semibold hover:underline">
                Detalhes &rarr;
              </Link>
            </div>
          </div>

          {/* Card 3: Ganhos Publisher */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                Publisher
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500">Ganhos como Publisher</p>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                `$${publisherBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Monetização de anúncios exibidos</span>
              <Link href="/wallet" className="text-emerald-600 font-semibold hover:underline">
                Detalhes &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas e Aplicativos Cadastrados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de Apps (2 colunas) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Aplicativos da Organização</h3>
              <p className="text-xs text-slate-500">Apps monitorados e integrados ao SDK MGP</p>
            </div>
            <Link
              href="/apps"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todos ({apps.length})
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : apps.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl p-6">
              <Smartphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-700">Nenhum aplicativo cadastrado</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Cadastre o seu primeiro aplicativo Android para começar a monetizar e participar da rede de troca de tráfego.
              </p>
              <Link
                href="/apps"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Primeiro App
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {apps.slice(0, 5).map((app) => (
                <div key={app.id} className="py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                      <Smartphone className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{app.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{app.packageName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                      {app.status}
                    </span>
                    <Link
                      href="/apps"
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      SDK Key &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo da Equipe & Atalhos (1 coluna) */}
        <div className="space-y-6">
          {/* Card Equipe */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Membros da Organização</h3>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-extrabold text-slate-900">{membersCount}</span>
              <span className="text-xs text-slate-500">membro(s) ativo(s)</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Gerencie permissões granulares por papel (Owner, Admin, Manager, Member, Analyst).
            </p>
            <Link
              href="/organization"
              className="block text-center w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Gerenciar Equipe & Convites
            </Link>
          </div>

          {/* Card Sessões e Segurança */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Segurança da Conta</h3>
              <Activity className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
              <span>Sessões Ativas</span>
              <span className="font-semibold text-slate-900">{user?.activeSessionsCount || 1}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mb-4">
              <span>Papel Global</span>
              <span className="font-semibold uppercase text-blue-600">{user?.role || 'USER'}</span>
            </div>
            <Link
              href="/settings"
              className="block text-center w-full py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Alterar Senha e Perfil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

