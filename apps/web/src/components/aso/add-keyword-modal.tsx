'use client';

import React, { useState, useEffect } from 'react';
import { X, KeyRound, Sparkles, Loader2, Plus, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface AddKeywordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asoAppId: string;
  appTitle: string;
}

export function AddKeywordModal({
  isOpen,
  onClose,
  onSuccess,
  asoAppId,
  appTitle,
}: AddKeywordModalProps) {
  const [keyword, setKeyword] = useState('');
  const [tag, setTag] = useState<'core' | 'brand' | 'competitor' | 'feature'>('core');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Busca sugestões da Google Play Store conforme o usuário digita
  useEffect(() => {
    const clean = keyword.trim();
    if (clean.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSuggesting(true);
      try {
        const res = await api.get(`/aso/scraper/suggest?term=${encodeURIComponent(clean)}&country=br&lang=pt`);
        if (res.success && Array.isArray(res.data)) {
          // Filtra sugestões diferentes do termo já digitado
          setSuggestions(res.data.slice(0, 6));
        }
      } catch {
        // Ignora erros silenciosamente no suggest
      } finally {
        setIsSuggesting(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [keyword]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) {
      setErrorMessage('Digite a palavra-chave que deseja rastrear.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await api.post(`/aso/apps/${asoAppId}/keywords`, {
        keyword: keyword.trim(),
        tag,
      });

      if (res.success) {
        setKeyword('');
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || res.message || 'Falha ao vincular palavra-chave.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro na comunicação com a API.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectSuggestion = (term: string) => {
    setKeyword(term);
    setSuggestions([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-400" />
              Rastrear Palavra-Chave
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Aplicativo: <span className="text-white font-semibold">{appTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Termo / Palavra-Chave Orgânica
            </label>
            <div className="relative">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ex: banco digital, cartão sem anuidade..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                autoFocus
              />
              {isSuggesting && (
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3 top-3" />
              )}
            </div>
          </div>

          {/* Sugestões automáticas da Google Play Store */}
          {suggestions.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Sugestões Populares na Play Store:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((term, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectSuggestion(term)}
                    className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/60 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-blue-400" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Categoria / Tag */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-medium text-slate-300">
              Classificação / Tag
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'core', label: 'Core / Principal' },
                { id: 'brand', label: 'Marca' },
                { id: 'competitor', label: 'Concorrente' },
                { id: 'feature', label: 'Recurso' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTag(t.id as any)}
                  className={`py-2 px-1 text-center rounded-lg text-xs font-semibold border transition-all ${
                    tag === t.id
                      ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Ao vincular, a plataforma pesquisa imediatamente a posição no ranking orgânico (top 100) da loja.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !keyword.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando Rank na Loja...
                </>
              ) : (
                'Iniciar Rastreio'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

