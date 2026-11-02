'use client';

import React, { useEffect, useState } from 'react';
import {
  Wallet,
  CreditCard,
  Repeat,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';

interface WalletAccount {
  id: string;
  type: 'ADVERTISING_CREDITS' | 'EXCHANGE_CREDITS' | 'PUBLISHER_EARNINGS';
  balance: string | number;
  currency: string;
}

interface WalletDetails {
  id: string;
  currency: string;
  balances: WalletAccount[];
}

export default function WalletPage() {
  const { currentOrg } = useAuth();
  const [wallet, setWallet] = useState<WalletDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    if (!currentOrg?.id) return;
    try {
      setLoading(true);
      const res = await api.get<{ wallet?: WalletDetails }>(`/organizations/${currentOrg.id}`);
      if (res.success && res.data?.wallet) {
        setWallet(res.data.wallet);
      } else {
        setWallet(null);
      }
    } catch {
      setWallet(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [currentOrg?.id]);

  const getAccount = (type: WalletAccount['type']) => {
    return wallet?.balances?.find((a) => a.type === type);
  };

  const adAccount = getAccount('ADVERTISING_CREDITS');
  const exchangeAccount = getAccount('EXCHANGE_CREDITS');
  const publisherAccount = getAccount('PUBLISHER_EARNINGS');

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Carteira & Finanças
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Controle financeiro com livro-razão de dupla entrada (Double-Entry Ledger) para{' '}
            <span className="font-semibold text-slate-800">{currentOrg?.name}</span>.
          </p>
        </div>

        <button
          onClick={fetchWallet}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Saldos
        </button>
      </div>

      {/* Regra de Segregação Contábil */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900">
          <p className="font-bold">Política Estrita de Segregação de Balanços (Fase 02 / 07)</p>
          <p className="mt-0.5 text-blue-700">
            Para garantir conformidade regulatória e proteção contra fraudes, cada conta opera de forma isolada. 
            Créditos de Troca de Tráfego não são passíveis de saque ou conversão para saldo publicitário comercial.
          </p>
        </div>
      </div>

      {/* Grid das 3 Contas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conta 1 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                Advertiser Account
              </span>
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Saldo Publicitário</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                `$${Number(adAccount?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">USD • Moeda Operacional</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Utilizado exclusivamente no pagamento de impressões e conversões de campanhas ativas.
          </div>
        </div>

        {/* Conta 2 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                Exchange Account
              </span>
              <Repeat className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Saldo de Troca de Tráfego</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                `$${Number(exchangeAccount?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">Créditos Não-Sacáveis</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Gerados pela exibição de anúncios parceiros na rede orgânica de troca.
          </div>
        </div>

        {/* Conta 3 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                Publisher Account
              </span>
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs font-semibold text-slate-500">Ganhos de Publisher</p>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                `$${Number(publisherAccount?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <p className="text-xs text-slate-400 font-mono mt-1">USD • Disponível para Saque</p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Receita líquida auferida por inventário publicitário de terceiros monetizado via SDK.
          </div>
        </div>
      </div>

      {/* Painel do Livro-Razão */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Extrato & Registro Contábil</h3>
            <p className="text-xs text-slate-500">Lançamentos de auditoria imutáveis com conciliação automática</p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Wallet ID: {wallet?.id || '—'}
          </div>
        </div>

        <div className="py-12 text-center border border-slate-100 rounded-xl bg-slate-50/50">
          <Wallet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">Nenhuma transação financeira pendente</p>
          <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1">
            Transações são registradas automaticamente em tempo real a cada impressão, clique, depósito e liquidação de ganhos.
          </p>
        </div>
      </div>
    </div>
  );
}

