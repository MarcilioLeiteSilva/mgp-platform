'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Eye, EyeOff, Image as ImageIcon, AlertCircle, CheckCircle2, Sparkles, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

interface Creative {
  id: string;
  campaignId: string;
  name?: string;
  format: 'BANNER' | 'NATIVE' | 'INTERSTITIAL' | 'REWARDED';
  title: string;
  description?: string;
  imageUrl: string;
  actionUrl: string;
  width?: number;
  height?: number;
  iconUrl?: string;
  ctaText?: string;
  starRating?: number;
  sponsorText?: string;
  skipOffsetSeconds?: number;
  rewardType?: string;
  rewardAmount?: number;
  requiredWatchSeconds?: number;
  isActive: boolean;
  createdAt: string;
}

interface CreativesModalProps {
  isOpen: boolean;
  campaignId: string;
  campaignName: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function CreativesModal({
  isOpen,
  campaignId,
  campaignName,
  onClose,
  onUpdated,
}: CreativesModalProps) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Formulário do novo criativo
  const [format, setFormat] = useState<'BANNER' | 'NATIVE' | 'INTERSTITIAL' | 'REWARDED'>('BANNER');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [width, setWidth] = useState('320');
  const [height, setHeight] = useState('50');
  const [ctaText, setCtaText] = useState('Instalar Agora');
  const [iconUrl, setIconUrl] = useState('');
  const [sponsorText, setSponsorText] = useState('');
  const [starRating, setStarRating] = useState('4.8');
  const [skipOffsetSeconds, setSkipOffsetSeconds] = useState('5');
  const [rewardType, setRewardType] = useState('COINS');
  const [rewardAmount, setRewardAmount] = useState('100');
  const [requiredWatchSeconds, setRequiredWatchSeconds] = useState('15');

  const [saving, setSaving] = useState(false);

  const loadCreatives = async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<Creative[]>(`/campaigns/${campaignId}/creatives`);
      if (Array.isArray(res)) {
        setCreatives(res);
      } else if (res && Array.isArray((res as any).data)) {
        setCreatives((res as any).data);
      } else {
        setCreatives([]);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar criativos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && campaignId) {
      loadCreatives();
      setIsAdding(false);
    }
  }, [isOpen, campaignId]);

  if (!isOpen) return null;

  const handleCreateCreative = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload: any = {
        name: title,
        format,
        title,
        imageUrl,
        actionUrl,
        ctaText,
      };

      if (description) payload.description = description;

      if (format === 'BANNER') {
        payload.width = parseInt(width, 10);
        payload.height = parseInt(height, 10);
      } else if (format === 'NATIVE') {
        if (iconUrl) payload.iconUrl = iconUrl;
        if (sponsorText) payload.sponsorText = sponsorText;
        if (starRating) payload.starRating = parseFloat(starRating);
      } else if (format === 'INTERSTITIAL') {
        payload.skipOffsetSeconds = parseInt(skipOffsetSeconds, 10);
      } else if (format === 'REWARDED') {
        payload.rewardType = rewardType;
        payload.rewardAmount = parseInt(rewardAmount, 10);
        payload.requiredWatchSeconds = parseInt(requiredWatchSeconds, 10);
      }

      await api.post(`/campaigns/${campaignId}/creatives`, payload);

      // Limpar formulário
      setTitle('');
      setDescription('');
      setImageUrl('');
      setActionUrl('');
      setIsAdding(false);
      await loadCreatives();
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar criativo.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (creative: Creative) => {
    try {
      await api.patch(`/campaigns/${campaignId}/creatives/${creative.id}`, {
        isActive: !creative.isActive,
      });
      await loadCreatives();
      onUpdated();
    } catch (err: any) {
      alert(`Erro ao alterar status: ${err.message}`);
    }
  };

  const handleDeleteCreative = async (creativeId: string) => {
    if (!confirm('Deseja realmente excluir este criativo?')) return;
    try {
      await api.delete(`/campaigns/${campaignId}/creatives/${creativeId}`);
      await loadCreatives();
      onUpdated();
    } catch (err: any) {
      alert(`Erro ao excluir criativo: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Criativos da Campanha</h2>
              <p className="text-xs text-slate-400">
                Gerenciando peças publicitárias de: <span className="text-indigo-400 font-semibold">{campaignName}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isAdding && (
              <button
                onClick={() => setIsAdding(true)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Criativo
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 text-rose-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form to Add New Creative */}
          {isAdding && (
            <div className="p-5 rounded-xl bg-slate-800/40 border border-blue-500/30 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  Cadastrar Novo Criativo
                </span>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>

              <form onSubmit={handleCreateCreative} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Formato do Anúncio *
                    </label>
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="BANNER">Banner (320x50, 300x250)</option>
                      <option value="NATIVE">Native (Card de Conteúdo Integrado)</option>
                      <option value="INTERSTITIAL">Interstitial (Tela Cheia com Skip)</option>
                      <option value="REWARDED">Rewarded (Vídeo com Recompensa)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Título do Anúncio *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Jogue Agora e Conquiste Reinos!"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      URL da Imagem / Vídeo (Asset) *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://cdn.example.com/assets/banner.png"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      URL de Destino ao Clicar *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://play.google.com/store/apps/details?id=com.app"
                      value={actionUrl}
                      onChange={(e) => setActionUrl(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Campos condicionais por formato */}
                {format === 'BANNER' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Largura (px)
                      </label>
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Altura (px)
                      </label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {format === 'INTERSTITIAL' && (
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Tempo de Espera para Skip (segundos)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={skipOffsetSeconds}
                      onChange={(e) => setSkipOffsetSeconds(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}

                {format === 'REWARDED' && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Tipo da Recompensa
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: COINS, GEMS, LIVES"
                        value={rewardType}
                        onChange={(e) => setRewardType(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Quantidade
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                        Duração Assistida Obrigatória (s)
                      </label>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        value={requiredWatchSeconds}
                        onChange={(e) => setRequiredWatchSeconds(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar Criativo'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List of Creatives */}
          {loading ? (
            <div className="text-center py-12 text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm">Carregando criativos da campanha...</p>
            </div>
          ) : creatives.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl">
              <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-white">Nenhum criativo cadastrado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Campanhas pagas exigem pelo menos um criativo ativo para que possam ser ativadas e entrar em leilão RTB.
              </p>
              <button
                onClick={() => setIsAdding(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Primeiro Criativo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creatives.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border transition-all ${
                    c.isActive
                      ? 'bg-slate-800/60 border-slate-700/80'
                      : 'bg-slate-900/60 border-slate-800/60 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {c.format}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          c.isActive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-700/40 text-slate-400'
                        }`}
                      >
                        {c.isActive ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(c)}
                        title={c.isActive ? 'Desativar criativo' : 'Ativar criativo'}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                      >
                        {c.isActive ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4 text-slate-500" />}
                      </button>
                      <button
                        onClick={() => handleDeleteCreative(c.id)}
                        title="Excluir criativo"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-white truncate mb-1">{c.title}</h4>
                  {c.description && <p className="text-xs text-slate-400 line-clamp-2 mb-2">{c.description}</p>}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <a
                      href={c.actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline flex items-center gap-1 truncate max-w-[200px]"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {c.actionUrl}
                    </a>
                    {c.format === 'BANNER' && (
                      <span className="text-slate-500">{c.width || 320}x{c.height || 50}px</span>
                    )}
                    {c.format === 'REWARDED' && (
                      <span className="text-amber-400 font-semibold">{c.rewardAmount || 100} {c.rewardType || 'COINS'}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

