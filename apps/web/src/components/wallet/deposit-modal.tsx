'use client';

import React, { useState } from 'react';
import { X, CreditCard, Copy, Check, QrCode, Sparkles, AlertCircle, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DepositModal({ isOpen, onClose, onSuccess }: DepositModalProps) {
  const [amount, setAmount] = useState('100.00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fatura gerada
  const [invoice, setInvoice] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);

  if (!isOpen) return null;

  const presets = ['50.00', '100.00', '250.00', '500.00', '1000.00'];

  const handleCreateDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      setError('O valor mínimo para recarga é de R$ 10,00.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/billing/deposits', {
        amount: numAmount,
        paymentMethod: 'PIX',
      });

      const data = (res as any)?.data || res;
      if (data && data.gatewayReference) {
        setInvoice(data);
      } else if (res && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar fatura de recarga.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (!invoice?.pixCopiaECola) return;
    navigator.clipboard.writeText(invoice.pixCopiaECola);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simulação de confirmação do gateway para testes imediatos
  const handleSimulatePayment = async () => {
    if (!invoice?.gatewayReference) return;
    setConfirming(true);
    try {
      await api.post(`/billing/deposits/${invoice.gatewayReference}/confirm`, {
        gatewayReference: invoice.gatewayReference,
        paidAmount: invoice.amount,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Falha ao confirmar depósito: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setInvoice(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Recarga de Créditos</h2>
              <p className="text-xs text-slate-400">Adicione saldo na sua conta de Anunciante via PIX</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="p-3.5 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!invoice ? (
            <form onSubmit={handleCreateDeposit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
                  Escolha um valor predefinido
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {presets.map((p) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => setAmount(p)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-all ${
                        amount === p
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      R$ {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Ou digite outro valor (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="10.00"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Valor mínimo: R$ 10,00.</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-400 flex items-center justify-between">
                <span>Método de Pagamento:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" />
                  PIX Instantâneo (Sem taxa)
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Gerando PIX...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Gerar Cobrança PIX</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 flex flex-col items-center">
                <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center mb-3">
                  <QrCode className="w-32 h-32 text-slate-900" />
                </div>
                <div className="text-xl font-bold text-white">
                  R$ {Number(invoice.amount).toFixed(2)}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Escaneie o QR Code ou copie o código abaixo</p>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  PIX Copia e Cola
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={invoice.pixCopiaECola}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 truncate focus:outline-none"
                  />
                  <button
                    onClick={handleCopyPix}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Botão de simulação rápida para dev/homologação */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Modo de Homologação</span>
                <button
                  type="button"
                  onClick={handleSimulatePayment}
                  disabled={confirming}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {confirming ? 'Confirmando...' : 'Simular Confirmação Instantânea'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

