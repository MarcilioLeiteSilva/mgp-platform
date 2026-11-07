'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  DollarSign,
  ArrowRight,
  Database,
  Terminal,
} from 'lucide-react';
import { api } from '@/lib/api';

export interface FraudIncidentItem {
  id: string;
  organizationId: string;
  appId?: string;
  campaignId?: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'DETECTED' | 'INVESTIGATING' | 'CONFIRMED' | 'DISMISSED' | 'RESOLVED';
  sourceIp?: string;
  deviceFingerprint?: string;
  evidencePayload: any;
  impactAmount: number | string;
  actionTaken?: string;
  resolvedAt?: string;
  createdAt: string;
  app?: {
    id: string;
    name: string;
    packageName: string;
  };
  campaign?: {
    id: string;
    name: string;
  };
}

interface IncidentDetailsModalProps {
  incident: FraudIncidentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function IncidentDetailsModal({
  incident,
  isOpen,
  onClose,
  onSuccess,
}: IncidentDetailsModalProps) {
  const [status, setStatus] = useState<'CONFIRMED' | 'DISMISSED' | 'RESOLVED'>('CONFIRMED');
  const [actionTaken, setActionTaken] = useState('');
  const [executeChargeback, setExecuteChargeback] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );

  if (!isOpen || !incident) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTaken.trim()) {
      setFeedback({ type: 'error', message: 'Descreva a ação tomada para a resolução do incidente.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await api.post(`/fraud/incidents/${incident.id}/resolve`, {
        status,
        actionTaken: actionTaken.trim(),
        executeChargeback,
        notes: notes.trim() || undefined,
      });

      setFeedback({
        type: 'success',
        message: 'Incidente atualizado e conciliação de estorno executada com sucesso!',
      });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Erro ao resolver incidente de fraude.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const impactNum = Number(incident.impactAmount) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                incident.severity === 'CRITICAL'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : incident.severity === 'HIGH'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Incidente de Tráfego Inválido (IVT)
                </h2>
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    incident.severity === 'CRITICAL'
                      ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      : incident.severity === 'HIGH'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}
                >
                  {incident.severity}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{incident.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`text-xs p-3.5 rounded-xl border flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Informações Gerais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Categoria</span>
            <span className="font-bold text-white mt-1 block truncate">{incident.category}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">App Afetado</span>
            <span className="font-bold text-slate-200 mt-1 block truncate">
              {incident.app?.name || 'Inventário Externo'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">IP de Origem</span>
            <span className="font-bold font-mono text-slate-300 mt-1 block truncate">
              {incident.sourceIp || '127.0.0.1'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase block font-semibold">Impacto</span>
            <span className="font-bold text-rose-400 mt-1 block">
              R$ {impactNum.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Evidências Técnicas Forenses */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-indigo-400" />
            Evidências Forenses de Tráfego
          </span>
          <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40">
            {JSON.stringify(incident.evidencePayload, null, 2)}
          </pre>
        </div>

        {/* Formulário de Resolução */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status da Decisão
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <option value="CONFIRMED">Confirmar Fraude (IVT Comprovado)</option>
                <option value="DISMISSED">Descartar (Falso Positivo)</option>
                <option value="RESOLVED">Marcar como Resolvido</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ação Tomada
              </label>
              <input
                type="text"
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                placeholder="Ex: Bloqueio de IP e estorno do lance"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
          </div>

          {status === 'CONFIRMED' && impactNum > 0 && (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-rose-400" />
                <div>
                  <p className="text-xs font-semibold text-white">
                    Executar Estorno Financeiro Automático (Fraud Chargeback)
                  </p>
                  <p className="text-[11px] text-rose-300">
                    Reembolsa R$ {impactNum.toFixed(2)} imediatamente na conta de créditos do anunciante no WalletLedger.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={executeChargeback}
                onChange={(e) => setExecuteChargeback(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-700 bg-slate-800"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Observações / Notas Internas (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Notas técnicas de investigação..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* Botões */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-500/20 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <span>Confirmar Resolução</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
