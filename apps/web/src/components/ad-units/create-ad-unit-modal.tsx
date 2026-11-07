'use client';

import React, { useState, useEffect } from 'react';
import { X, LayoutGrid, AlertCircle, Sparkles, Smartphone, Layers } from 'lucide-react';
import { api } from '@/lib/api';

interface AppItem {
  id: string;
  name: string;
  packageName: string;
  platform: string;
}

interface CreateAdUnitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateAdUnitModal({ isOpen, onClose, onSuccess }: CreateAdUnitModalProps) {
  const [apps, setApps] = useState<AppItem[]>([]);
  const [appId, setAppId] = useState('');
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'BANNER' | 'NATIVE' | 'INTERSTITIAL' | 'REWARDED'>('BANNER');
  const [placement, setPlacement] = useState('');
  const [floorEcpm, setFloorEcpm] = useState('0.00');

  const [loadingApps, setLoadingApps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadApps();
    }
  }, [isOpen]);

  const loadApps = async () => {
    setLoadingApps(true);
    try {
      const res = await api.get<any>('/apps');
      const items = Array.isArray(res) ? res : res?.data || [];
      setApps(items);
      if (items.length > 0 && !appId) {
        setAppId(items[0].id);
      }
    } catch (err: any) {
      setError('Falha ao carregar aplicativos cadastrados.');
    } finally {
      setLoadingApps(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId) {
      setError('Selecione um aplicativo para vincular este bloco.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        appId,
        name,
        format,
        floorEcpm: parseFloat(floorEcpm) || 0.0,
      };

      if (placement.trim()) {
        payload.placement = placement.trim();
      }

      const res = await api.post('/ad-units', payload);

      if (res && res.error) {
        setError(res.error);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar bloco de anúncios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Novo Bloco de Anúncios</h2>
              <p className="text-xs text-slate-400">Configure uma Ad Unit para monetizar seu aplicativo</p>
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

          {/* Aplicativo Vinculado */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Aplicativo Proprietário *
            </label>
            {loadingApps ? (
              <div className="text-xs text-slate-500 py-2">Carregando aplicativos...</div>
            ) : apps.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                Nenhum aplicativo cadastrado. Acesse "Meus Aplicativos" para cadastrar seu primeiro app.
              </div>
            ) : (
              <select
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                required
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>
                    {app.name} ({app.packageName})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Nome da Ad Unit */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Nome do Bloco *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Banner Topo Tela Inicial"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Formato e Floor eCPM */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Formato do Anúncio *
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              >
                <option value="BANNER">Banner (320x50, 300x250)</option>
                <option value="NATIVE">Native Ad (Card Integrado)</option>
                <option value="INTERSTITIAL">Interstitial (Tela Cheia)</option>
                <option value="REWARDED">Rewarded (Vídeo Premiado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Floor eCPM (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={floorEcpm}
                  onChange={(e) => setFloorEcpm(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Placement Tag (Opcional) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Placement Tag (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: home_top, game_over_modal, reward_chest"
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Útil para segmentar múltiplos blocos de mesmo formato no app.
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || apps.length === 0}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Cadastrar Bloco</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

