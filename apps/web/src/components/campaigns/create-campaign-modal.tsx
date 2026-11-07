'use client';

import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, DollarSign, Target, Calendar } from 'lucide-react';
import { api } from '@/lib/api';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateCampaignModal({ isOpen, onClose, onSuccess }: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'PAID' | 'CROSS_PROMO' | 'HOUSE'>('PAID');
  const [billingModel, setBillingModel] = useState<'CPM' | 'CPC'>('CPM');
  const [bidAmount, setBidAmount] = useState('2.50');
  const [dailyBudget, setDailyBudget] = useState('50.00');
  const [totalBudget, setTotalBudget] = useState('500.00');
  const [frequencyCapPerHour, setFrequencyCapPerHour] = useState('3');
  const [priorityTier, setPriorityTier] = useState('2');
  const [targetCountry, setTargetCountry] = useState('BR');
  const [targetCategories, setTargetCategories] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = {
        name,
        type,
        billingModel,
        bidAmount: parseFloat(bidAmount),
        dailyBudget: parseFloat(dailyBudget),
        totalBudget: parseFloat(totalBudget),
        frequencyCapPerHour: parseInt(frequencyCapPerHour, 10),
        priorityTier: parseInt(priorityTier, 10),
        targetCountry: targetCountry.trim().toUpperCase(),
        targetCategories: targetCategories.trim().toUpperCase(),
      };

      if (startDate) payload.startDate = new Date(startDate).toISOString();
      if (endDate) payload.endDate = new Date(endDate).toISOString();

      const res = await api.post('/campaigns', payload);

      if (res && (res as any).id) {
        onSuccess();
        onClose();
      } else if (res && res.error) {
        setError(res.error);
      } else {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao criar campanha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Nova Campanha Publicitária</h2>
              <p className="text-xs text-slate-400">Configure os parâmetros de leilão RTB, orçamento e segmentação</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Nome da Campanha *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Aquisição Q4 - Usuários Gamers Brasil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Tipo e Modelo de Cobrança */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Tipo da Campanha
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="PAID">PAID (Paga - requer saldo)</option>
                <option value="CROSS_PROMO">CROSS_PROMO (Promoção Cruzada)</option>
                <option value="HOUSE">HOUSE (Anúncios Próprios)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Modelo de Cobrança (RTB)
              </label>
              <select
                value={billingModel}
                onChange={(e) => setBillingModel(e.target.value as any)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="CPM">CPM (Custo por Mil Impressões)</option>
                <option value="CPC">CPC (Custo por Clique)</option>
              </select>
            </div>
          </div>

          {/* Lances e Orçamentos */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Lance Máximo (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Orçamento Diário (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Orçamento Total (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Segmentação & Geo-Targeting */}
          <div className="border-t border-slate-800/80 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Segmentação de Público & Geo-Targeting
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  País Alvo (Código ISO 2)
                </label>
                <input
                  type="text"
                  maxLength={2}
                  placeholder="BR, US, PT..."
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value.toUpperCase())}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Categorias de Aplicativos
                </label>
                <input
                  type="text"
                  placeholder="ALL ou GAME,FINANCE,SHOPPING"
                  value={targetCategories}
                  onChange={(e) => setTargetCategories(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Prioridade & Frequency Capping */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Frequency Capping (Impressões/hora/usuário)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={frequencyCapPerHour}
                onChange={(e) => setFrequencyCapPerHour(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Tier de Prioridade Leilão (1 a 5)
              </label>
              <select
                value={priorityTier}
                onChange={(e) => setPriorityTier(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="1">1 - Direto / Campanha Própria (Prioridade Máxima)</option>
                <option value="2">2 - Anunciante Pago Premium</option>
                <option value="3">3 - Anunciante Pago Padrão</option>
                <option value="4">4 - Rede Parceira / Backfill</option>
                <option value="5">5 - Sob Demanda Residual</option>
              </select>
            </div>
          </div>

          {/* Período de Veiculação */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Data de Início
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Data de Término
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Footer Buttons */}
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
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Criar Campanha</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

