'use client';

import React, { useState } from 'react';
import { X, DollarSign, AlertCircle, Sparkles, ShieldCheck, ArrowDownLeft } from 'lucide-react';
import { api } from '@/lib/api';

interface PayoutModalProps {
  isOpen: boolean;
  availableBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function PayoutModal({ isOpen, availableBalance, onClose, onSuccess }: PayoutModalProps) {
  const [amount, setAmount] = useState('50.00');
  const [payoutMethod, setPayoutMethod] = useState<'PIX' | 'BANK_TRANSFER'>('PIX');
  const [recipientKey, setRecipientKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 50.0) {
      setError('O valor mínimo para solicitação de saque é de R$ 50,00.');
      setLoading(false);
      return;
    }

    if (numAmount > availableBalance) {
      setError(`Saldo insuficiente. Você possui R$ ${availableBalance.toFixed(2)} disponível.`);
      setLoading(false);
      return;
    }

    if (!recipientKey.trim()) {
      setError('Informe a chave de destino do repasse.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/billing/payouts', {
        amount: numAmount,
        payoutMethod,
        recipientKey: recipientKey.trim(),
      });

      if (res && res.error) {
        setError(res.error);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar saque.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Solicitar Saque de Ganhos</h2>
              <p className="text-xs text-slate-400">Repasse para publishers via PIX ou Transferência</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Saldo Disponível */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Saldo Disponível para Saque
              </span>
              <span className="text-xl font-bold text-emerald-400">
                R$ {availableBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAmount(availableBalance.toFixed(2))}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Sacar Tudo
            </button>
          </div>

          {/* Valor do Saque */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Valor do Saque (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">R$</span>
              <input
                type="number"
                step="0.01"
                min="50.00"
                max={availableBalance}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-semibold"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Valor mínimo permitido para saque: R$ 50,00.</p>
          </div>

          {/* Método de Saque */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Método de Repasse *
            </label>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value as any)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="PIX">PIX (Instantâneo)</option>
              <option value="BANK_TRANSFER">TED / Transferência Bancária</option>
            </select>
          </div>

          {/* Chave de Destino */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              {payoutMethod === 'PIX' ? 'Chave PIX de Destino *' : 'Dados Bancários / Chave *'}
            </label>
            <input
              type="text"
              required
              placeholder={payoutMethod === 'PIX' ? 'CPF, CNPJ, Email, Telefone ou EVP' : 'Banco, Agência e Conta'}
              value={recipientKey}
              onChange={(e) => setRecipientKey(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 flex items-start gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              O valor solicitado é imediatamente debitado e retido em custódia no livro-razão (WalletLedger). Repasses via PIX são processados em até 24 horas úteis.
            </span>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || availableBalance < 50}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/25 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enviando solicitação...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Confirmar Solicitação de Saque</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

