'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api';

interface SimulateInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SimulateInspectionModal({
  isOpen,
  onClose,
  onSuccess,
}: SimulateInspectionModalProps) {
  const [clickDeltaMs, setClickDeltaMs] = useState<string>('120');
  const [clicksPerMinute, setClicksPerMinute] = useState<string>('5');
  const [isEmulator, setIsEmulator] = useState(false);
  const [isRooted, setIsRooted] = useState(false);
  const [hasViewToken, setHasViewToken] = useState(true);
  const [sourceIp, setSourceIp] = useState('185.220.101.5');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const payload: any = {
        hasViewToken,
        isEmulator,
        isRooted,
        sourceIp,
      };

      if (clickDeltaMs) payload.clickDeltaMs = parseInt(clickDeltaMs, 10);
      if (clicksPerMinute) payload.clicksPerMinute = parseInt(clicksPerMinute, 10);

      const res = await api.post<any>('/fraud/simulate-inspection', payload);
      const data = (res as any)?.data || res;
      setResult(data);
      if (data?.isFraud) {
        onSuccess();
      }
    } catch (err: any) {
      setResult({ isFraud: false, error: err.message || 'Falha ao inspecionar tráfego.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = (preset: 'CLICK_INJECTION' | 'CLICK_SPAM' | 'EMULATOR' | 'LEGITIMATE') => {
    if (preset === 'CLICK_INJECTION') {
      setClickDeltaMs('80');
      setClicksPerMinute('2');
      setIsEmulator(false);
      setIsRooted(false);
      setHasViewToken(true);
    } else if (preset === 'CLICK_SPAM') {
      setClickDeltaMs('1200');
      setClicksPerMinute('35');
      setIsEmulator(false);
      setIsRooted(false);
      setHasViewToken(true);
    } else if (preset === 'EMULATOR') {
      setClickDeltaMs('2500');
      setClicksPerMinute('1');
      setIsEmulator(true);
      setIsRooted(false);
      setHasViewToken(true);
    } else {
      setClickDeltaMs('3200');
      setClicksPerMinute('2');
      setIsEmulator(false);
      setIsRooted(false);
      setHasViewToken(true);
    }
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Simulador de Inspeção de Tráfego (IVT)
              </h2>
              <p className="text-xs text-slate-400">
                Teste de regras heurísticas, latência e integridade do SDK em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Rápidos */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Cenários de Teste Rápidos
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => handlePreset('CLICK_INJECTION')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700/60"
            >
              Click Injection
            </button>
            <button
              type="button"
              onClick={() => handlePreset('CLICK_SPAM')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700/60"
            >
              Click Flooding
            </button>
            <button
              type="button"
              onClick={() => handlePreset('EMULATOR')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium border border-slate-700/60"
            >
              Farm Emulador
            </button>
            <button
              type="button"
              onClick={() => handlePreset('LEGITIMATE')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-[11px] font-medium border border-emerald-500/20"
            >
              Tráfego Legítimo
            </button>
          </div>
        </div>

        <form onSubmit={handleSimulate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Click Delta (ms após impressão)
              </label>
              <input
                type="number"
                min="0"
                value={clickDeltaMs}
                onChange={(e) => setClickDeltaMs(e.target.value)}
                placeholder="Ex: 120"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <span className="text-[10px] text-slate-500">Delta &lt; 300ms aciona gatilho de injeção</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Frequência (Cliques/minuto)
              </label>
              <input
                type="number"
                min="0"
                value={clicksPerMinute}
                onChange={(e) => setClicksPerMinute(e.target.value)}
                placeholder="Ex: 5"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <span className="text-[10px] text-slate-500">&gt; 15/min aciona alarme de spamming</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isEmulator}
                onChange={(e) => setIsEmulator(e.target.checked)}
                className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
              />
              <span>Ambiente Emulador</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isRooted}
                onChange={(e) => setIsRooted(e.target.checked)}
                className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
              />
              <span>Dispositivo Rooted</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer col-span-2">
              <input
                type="checkbox"
                checked={hasViewToken}
                onChange={(e) => setHasViewToken(e.target.checked)}
                className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Possui Token de Impressão (MRC Viewability)</span>
            </label>
          </div>

          {result && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
                result.isFraud
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.isFraud ? (
                  <>
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    <span>IVT DETECTADO — {result.category}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>TRÁFEGO LEGÍTIMO</span>
                  </>
                )}
              </div>
              <p className="text-slate-300">{result.reason}</p>
              {result.incidentId && (
                <p className="text-[10px] font-mono opacity-70">
                  Incidente persistido no banco: {result.incidentId}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-500/20 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Avaliando...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Inspecionar Amostra</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
