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
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { DepositModal } from '@/components/wallet/deposit-modal';
import { PayoutModal } from '@/components/wallet/payout-modal';

interface WalletOverview {
  walletId: string;
  currency: string;
  advertisingCredits: number;
  exchangeCredits: number;
  publisherEarnings: number;
}

interface LedgerTransaction {
  id: string;
  transactionType: string;
  amount: number | string;
  balanceAfter: number | string;
  description: string;
  createdAt: string;
  account?: {
    type: string;
    currency: string;
  };
}

interface PayoutItem {
  id: string;
  amount: number | string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  payoutMethod: string;
  recipientKey: string;
  createdAt: string;
  processedAt?: string;
}

export default function WalletPage() {
  const { currentOrg } = useAuth();
  const [wallet, setWallet] = useState<WalletOverview | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [walletRes, transRes, payoutsRes] = await Promise.all([
        api.get<WalletOverview>('/billing/wallet'),
        api.get<{ data: LedgerTransaction[] }>('/billing/transactions?limit=20'),
        api.get<{ data: PayoutItem[] }>('/billing/payouts?limit=10'),
      ]);

      const walletData = (walletRes as any)?.data || walletRes;
      if (walletData && walletData.walletId) {
        setWallet(walletData);
      }

      const transData = (transRes as any)?.data || (transRes as any)?.items || [];
      setTransactions(Array.isArray(transData) ? transData : []);

      const payoutsData = (payoutsRes as any)?.data || (payoutsRes as any)?.items || [];
      setPayouts(Array.isArray(payoutsData) ? payoutsData : []);
    } catch (err) {
      console.error('Falha ao carregar carteira:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg?.id]);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Carteira & Finanças</h1>
              <p className="text-sm text-slate-400">
                Livro-razão contábil com segregação estrita para <span className="font-semibold text-slate-200">{currentOrg?.name}</span>
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Saldos</span>
        </button>
      </div>

      {/* Segregação de Balanços */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300">
          <p className="font-bold text-white">Política Estrita de Segregação de Contas Contábeis (Double-Entry Ledger)</p>
          <p className="mt-0.5 text-blue-400">
            Cada conta opera sob isolamento estrito. Créditos de Troca Orgânica de Tráfego não são passíveis de saque.
            Ganhos auferidos por monetização (Publishers) podem ser sacados a qualquer momento a partir de R$ 50,00 via PIX.
          </p>
        </div>
      </div>

      {/* Grid das 3 Contas Contábeis (ADVERTISING_CREDITS, EXCHANGE_CREDITS, PUBLISHER_EARNINGS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conta 1: Anunciante (ADVERTISING_CREDITS) */}
        <div data-account-type="ADVERTISING_CREDITS" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                Advertiser Account
              </span>
              <CreditCard className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400">Saldo Publicitário</p>
            <p className="text-3xl font-extrabold text-white mt-2">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              ) : (
                `R$ ${(wallet?.advertisingCredits ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">BRL • Saldo para Veiculação</p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => setIsDepositOpen(true)}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Créditos (PIX)</span>
            </button>
          </div>
        </div>

        {/* Conta 2: Troca de Tráfego (EXCHANGE_CREDITS) */}
        <div data-account-type="EXCHANGE_CREDITS" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                Exchange Account
              </span>
              <Repeat className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400">Troca Orgânica de Tráfego</p>
            <p className="text-3xl font-extrabold text-white mt-2">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              ) : (
                `R$ ${(wallet?.exchangeCredits ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">Créditos Não-Sacáveis</p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            Gerados automaticamente ao exibir anúncios parceiros na rede orgânica.
          </div>
        </div>

        {/* Conta 3: Publisher (PUBLISHER_EARNINGS) */}
        <div data-account-type="PUBLISHER_EARNINGS" className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                Publisher Account
              </span>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400">Ganhos de Publisher</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-2">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
              ) : (
                `R$ ${(wallet?.publisherEarnings ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </p>
            <p className="text-xs text-slate-500 font-mono mt-1">BRL • Disponível para Saque</p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <button
              onClick={() => setIsPayoutOpen(true)}
              disabled={(wallet?.publisherEarnings ?? 0) < 50}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>Solicitar Saque (PIX)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Histórico de Solicitações de Saque (Payouts) */}
      {payouts.length > 0 && (
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Solicitações de Saque Recentes</h3>
              <p className="text-xs text-slate-400">Acompanhamento dos repasses solicitados para a conta</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Método / Chave</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-slate-300">
                      {new Date(p.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : p.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono">
                      {p.payoutMethod} • {p.recipientKey}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-200">
                      R$ {Number(p.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Extrato do Livro-Razão (WalletLedger) */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Extrato & Registro Contábil Imutável</h3>
            <p className="text-xs text-slate-400">Lançamentos de auditoria com conciliação automática</p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Wallet ID: {wallet?.walletId || '—'}
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
            <Wallet className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-300">Nenhuma transação financeira registrada</p>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
              Transações são registradas em tempo real a cada recarga, lance em leilão RTB e liquidação de ganhos de publisher.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">Data/Hora</th>
                  <th className="py-2.5 px-3">Conta</th>
                  <th className="py-2.5 px-3">Tipo de Transação</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3 text-right">Valor</th>
                  <th className="py-2.5 px-3 text-right">Saldo Posterior</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => {
                  const numAmount = Number(tx.amount);
                  const isPositive = numAmount > 0;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(tx.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700/60">
                          {tx.account?.type || 'LEDGER'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-medium">
                        {tx.transactionType}
                      </td>
                      <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-bold ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}R$ {numAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300">
                        R$ {Number(tx.balanceAfter).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modais de Depósito e Saque */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={() => fetchData()}
      />

      <PayoutModal
        isOpen={isPayoutOpen}
        availableBalance={wallet?.publisherEarnings ?? 0}
        onClose={() => setIsPayoutOpen(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
