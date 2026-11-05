'use client';

import React, { useState } from 'react';
import { X, Search, Smartphone, ShieldAlert, Check, Loader2, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingApps?: Array<{ id: string; title: string; appId: string }>;
  defaultIsCompetitor?: boolean;
}

export function AddAppModal({
  isOpen,
  onClose,
  onSuccess,
  existingApps = [],
  defaultIsCompetitor = false,
}: AddAppModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form state
  const [appId, setAppId] = useState('');
  const [selectedPreview, setSelectedPreview] = useState<any | null>(null);
  const [isCompetitor, setIsCompetitor] = useState(defaultIsCompetitor);
  const [targetAppId, setTargetAppId] = useState('');
  const [country, setCountry] = useState('br');
  const [lang, setLang] = useState('pt');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMessage('');
    try {
      const res = await api.get(`/aso/scraper/search?term=${encodeURIComponent(searchQuery)}&country=${country}&lang=${lang}&num=10`);
      if (res.success && Array.isArray(res.data)) {
        setSearchResults(res.data);
      } else {
        setSearchResults([]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao buscar aplicativos na loja.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectApp = (item: any) => {
    setAppId(item.appId);
    setSelectedPreview(item);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId.trim()) {
      setErrorMessage('Informe ou selecione o identificador do pacote (appId).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload: any = {
        appId: appId.trim(),
        isCompetitor,
        country,
        lang,
      };

      if (isCompetitor && targetAppId) {
        payload.targetAppId = targetAppId;
      }

      const res = await api.post('/aso/apps', payload);

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || res.message || 'Erro ao registrar aplicativo.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao comunicar com o servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              Rastrear Aplicativo ou Concorrente
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Insira o pacote da Google Play Store para iniciar monitoramento contínuo e auditoria ASO.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Type Toggle: Pesquisa vs Manual */}
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 rounded-md transition-all ${
                activeTab === 'search' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pesquisar na Loja (Google Play)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 rounded-md transition-all ${
                activeTab === 'manual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Inserir Package ID Manual
            </button>
          </div>

          {activeTab === 'search' ? (
            <div className="space-y-4">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Ex: Nubank, WhatsApp, Shopee..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>
              </form>

              {/* Resultados da busca */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Resultados Encontrados ({searchResults.length})
                  </p>
                  {searchResults.map((item) => {
                    const isSelected = appId === item.appId;
                    return (
                      <div
                        key={item.appId}
                        onClick={() => handleSelectApp(item)}
                        className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-blue-600/10 border-blue-500 text-white'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <img
                            src={item.icon || '/placeholder.png'}
                            alt={item.title}
                            className="w-10 h-10 rounded-lg bg-slate-800 object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{item.title}</p>
                            <p className="text-[11px] text-slate-400 truncate">{item.developer} • {item.appId}</p>
                            <p className="text-[10px] text-amber-400">★ {item.score ? item.score.toFixed(1) : '—'}</p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          {isSelected ? (
                            <span className="p-1.5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="px-2.5 py-1 text-[11px] font-medium text-slate-400 border border-slate-700 rounded-md hover:text-white hover:bg-slate-800"
                            >
                              Selecionar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Identificador do Pacote (Package ID Android)
              </label>
              <input
                type="text"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="Ex: com.nu.production"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-500">
                Localizado na URL da Play Store: <code className="text-slate-400">id=com.pacote.app</code>
              </p>
            </div>
          )}

          {/* Preview selecionado */}
          {appId && (
            <div className="p-3 bg-slate-950 rounded-xl border border-blue-500/30 flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">Aplicativo a Monitorar:</span>
                <p className="text-xs font-mono font-bold text-white truncate">{appId}</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Pronto para Rastreio
              </span>
            </div>
          )}

          {/* Configurações de Monitoramento */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
              <div>
                <p className="text-xs font-semibold text-white">Classificar como Concorrente</p>
                <p className="text-[11px] text-slate-400">
                  {isCompetitor
                    ? 'Será listado na aba de Benchmarking Competitivo.'
                    : 'Será listado como Aplicativo Principal da sua Organização.'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={isCompetitor}
                onChange={(e) => setIsCompetitor(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>

            {isCompetitor && existingApps.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Concorrente Direto de qual App Principal? (Opcional)
                </label>
                <select
                  value={targetAppId}
                  onChange={(e) => setTargetAppId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Nenhum (Concorrente Geral)</option>
                  {existingApps.map((a) => (
                    <option key={a.id} value={a.appId}>
                      {a.title} ({a.appId})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">País da Loja</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="br">Brasil (BR)</option>
                  <option value="us">Estados Unidos (US)</option>
                  <option value="mx">México (MX)</option>
                  <option value="es">Espanha (ES)</option>
                  <option value="gb">Reino Unido (GB)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Idioma</label>
                <select
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                >
                  <option value="pt">Português (PT)</option>
                  <option value="en">Inglês (EN)</option>
                  <option value="es">Espanhol (ES)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !appId.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Coletando e Auditando...
              </>
            ) : (
              <>
                Confirmar Monitoramento
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

