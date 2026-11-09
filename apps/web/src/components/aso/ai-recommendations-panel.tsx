'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Lightbulb,
  Layers,
  Sliders,
  Send,
  Trash2,
  ChevronRight,
  TrendingUp,
  Target,
  FileText,
  DollarSign,
  Megaphone,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  AsoAiRecommendationDto,
  AsoAiSuggestionItemDto,
  AsoAiRecommendationType,
  AsoAiRecommendationStatus,
} from '@mgp/contracts';

interface AiRecommendationsPanelProps {
  asoAppId: string;
  app: any;
  onAppUpdated?: () => void;
}

const RECOMMENDATION_TYPES: { id: AsoAiRecommendationType; label: string; icon: any; description: string }[] = [
  {
    id: 'TITLE_OPTIMIZATION',
    label: 'Otimização de Título',
    icon: FileText,
    description: 'Títulos persuasivos e indexáveis de até 30 caracteres (limite Google Play).',
  },
  {
    id: 'DESCRIPTION_OPTIMIZATION',
    label: 'Descrição Curta & Longa',
    icon: Lightbulb,
    description: 'Descrições de alto impacto comercial (limite de 80 caracteres na descrição curta).',
  },
  {
    id: 'KEYWORD_EXPANSION',
    label: 'Expansão de Palavras-Chave',
    icon: TrendingUp,
    description: 'Sugestões de termos correlatos de alta relevância orgânica e cauda longa.',
  },
  {
    id: 'CAMPAIGN_STRATEGY',
    label: 'Estratégia de Campanhas',
    icon: DollarSign,
    description: 'Calibração de lances (eCPM) e públicos-alvo para campanhas no Ad Server.',
  },
  {
    id: 'CREATIVE_COPY',
    label: 'Copywriting de Criativos',
    icon: Megaphone,
    description: 'Headlines e chamadas para ação com alta taxa de cliques (CTR) e conversão.',
  },
];

const TONES = [
  { id: 'PERSUASIVE', label: 'Persuasivo (Conversão)' },
  { id: 'PROFESSIONAL', label: 'Profissional / Formal' },
  { id: 'PLAYFUL', label: 'Descontraído / Viral' },
  { id: 'TECHNICAL', label: 'Técnico & Focado em Recursos' },
];

export function AiRecommendationsPanel({ asoAppId, app, onAppUpdated }: AiRecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<AsoAiRecommendationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [applyingSuggestionId, setApplyingSuggestionId] = useState<string | null>(null);
  const [dismissingRecId, setDismissingRecId] = useState<string | null>(null);

  // Form State
  const [selectedType, setSelectedType] = useState<AsoAiRecommendationType>('TITLE_OPTIMIZATION');
  const [selectedTone, setSelectedTone] = useState<'PERSUASIVE' | 'PROFESSIONAL' | 'PLAYFUL' | 'TECHNICAL'>('PERSUASIVE');
  const [customKeywords, setCustomKeywords] = useState<string>('');

  // Filter State
  const [statusFilter, setStatusFilter] = useState<'ALL' | AsoAiRecommendationStatus>('ALL');

  // Feedback State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchRecommendations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<AsoAiRecommendationDto[]>(
        `/api/v1/aso/apps/${asoAppId}/ai/recommendations`,
      );
      const data = res?.data || (res as any);
      if (Array.isArray(data)) {
        setRecommendations(data);
      }
    } catch (err: any) {
      console.error('Falha ao listar recomendações:', err);
    } finally {
      setIsLoading(false);
    }
  }, [asoAppId]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      const focusKeywords = customKeywords
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      const res = await api.post(`/api/v1/aso/apps/${asoAppId}/ai/recommendations/generate`, {
        type: selectedType,
        tone: selectedTone,
        focusKeywords: focusKeywords.length > 0 ? focusKeywords : undefined,
      });

      showToast('Recomendações geradas com sucesso!');
      await fetchRecommendations();
    } catch (err: any) {
      showToast('Erro ao gerar: ' + (err.message || 'Falha na requisição'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = async (recId: string, suggestionId: string) => {
    try {
      setApplyingSuggestionId(suggestionId);
      await api.post(`/api/v1/aso/ai/recommendations/${recId}/apply`, {
        suggestionId,
      });
      showToast('Sugestão aplicada com sucesso no aplicativo!');
      if (onAppUpdated) {
        onAppUpdated();
      }
      await fetchRecommendations();
    } catch (err: any) {
      showToast('Falha ao aplicar sugestão: ' + (err.message || 'Erro inesperado'));
    } finally {
      setApplyingSuggestionId(null);
    }
  };

  const handleDismiss = async (recId: string) => {
    try {
      setDismissingRecId(recId);
      await api.post(`/api/v1/aso/ai/recommendations/${recId}/dismiss`, {});
      showToast('Recomendação descartada.');
      await fetchRecommendations();
    } catch (err: any) {
      showToast('Falha ao descartar: ' + (err.message || 'Erro inesperado'));
    } finally {
      setDismissingRecId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredRecommendations = recommendations.filter((r) => {
    if (statusFilter === 'ALL') return true;
    return r.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 border border-blue-500/40 text-white rounded-xl shadow-2xl animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Generator Studio Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Estúdio de IA & Otimização ASO
                  </h2>
                  <p className="text-xs text-slate-400">
                    Gere redações persuasivas, otimize limites de caracteres da Play Store e planeje lances de campanhas.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-500/20 flex items-center gap-2 transition-all disabled:opacity-50 shrink-0"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Processando Modelos...' : 'Gerar Novas Sugestões com IA'}
            </button>
          </div>

          {/* Form Selector */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Modalidade de Otimização
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as AsoAiRecommendationType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {RECOMMENDATION_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Tom de Voz da Redação
              </label>
              <select
                value={selectedTone}
                onChange={(e) => setSelectedTone(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
              >
                {TONES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                Palavras-Chave Focais (Opcional, separadas por vírgula)
              </label>
              <input
                type="text"
                value={customKeywords}
                onChange={(e) => setCustomKeywords(e.target.value)}
                placeholder="ex: finanças, controle, cartão"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* History and Status Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-semibold mr-1">Filtrar:</span>
          {(['ALL', 'ACTIVE', 'APPLIED', 'DISMISSED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                statusFilter === st
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st === 'ALL'
                ? 'Todas'
                : st === 'ACTIVE'
                ? 'Ativas'
                : st === 'APPLIED'
                ? 'Aplicadas'
                : 'Descartadas'}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500">
          Mostrando {filteredRecommendations.length} de {recommendations.length} recomendações
        </div>
      </div>

      {/* Recommendations Feed */}
      {isLoading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <RefreshCw className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Carregando Recomendações...</p>
          <p className="text-xs text-slate-400 mt-1">Buscando insights heurísticos e modelos de linguagem generativos.</p>
        </div>
      ) : filteredRecommendations.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-300">Nenhuma recomendação encontrada</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Utilize o botão acima para gerar a primeira análise de inteligência para o aplicativo com palavras-chave prioritárias.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRecommendations.map((rec) => {
            const typeConfig = RECOMMENDATION_TYPES.find((t) => t.id === rec.type) || RECOMMENDATION_TYPES[0];
            const Icon = typeConfig.icon;

            return (
              <div
                key={rec.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-700 transition-colors"
              >
                {/* Recommendation Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-slate-800 border border-slate-700 rounded-xl text-purple-400">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{typeConfig.label}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            rec.status === 'APPLIED'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : rec.status === 'DISMISSED'
                              ? 'bg-slate-800 text-slate-400 border border-slate-700'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {rec.status === 'APPLIED' ? 'Aplicada' : rec.status === 'DISMISSED' ? 'Descartada' : 'Ativa'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Gerada em {new Date(rec.createdAt).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(rec.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Modelo: {rec.modelUsed}
                      </span>
                    </div>
                  </div>

                  {rec.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleDismiss(rec.id)}
                      disabled={dismissingRecId === rec.id}
                      title="Descartar esta recomendação"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Descartar
                    </button>
                  )}
                </div>

                {/* Suggestions Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {rec.suggestions.map((suggestion: AsoAiSuggestionItemDto) => {
                    const isWithinLimit =
                      !suggestion.maxCharacters || suggestion.characterCount <= suggestion.maxCharacters;

                    return (
                      <div
                        key={suggestion.id}
                        className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3"
                      >
                        {/* Meta and Score Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono text-[10px] font-bold rounded">
                              {suggestion.field}
                            </span>
                            {suggestion.maxCharacters && (
                              <span
                                className={`text-[11px] font-mono flex items-center gap-1 ${
                                  isWithinLimit ? 'text-slate-400' : 'text-rose-400 font-bold'
                                }`}
                              >
                                {suggestion.characterCount}/{suggestion.maxCharacters} chars
                                {isWithinLimit ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-rose-400" />
                                )}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400 font-semibold">Impacto Estimado:</span>
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-xs ${
                                suggestion.impactScore >= 90
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : suggestion.impactScore >= 80
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {suggestion.impactScore}/100
                            </span>
                          </div>
                        </div>

                        {/* Suggested Value Comparison */}
                        <div className="space-y-1.5">
                          {suggestion.currentValue && (
                            <div className="text-xs">
                              <span className="text-slate-500 font-mono text-[10px] uppercase block">Valor Atual:</span>
                              <p className="text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg font-mono text-xs line-through opacity-70">
                                {suggestion.currentValue}
                              </p>
                            </div>
                          )}

                          <div className="text-xs">
                            <span className="text-purple-400 font-mono text-[10px] uppercase font-bold block">
                              Sugestão Otimizada:
                            </span>
                            <div className="flex items-center justify-between gap-2 bg-purple-950/20 border border-purple-500/30 px-3 py-2 rounded-lg">
                              <p className="text-white font-semibold text-xs whitespace-pre-line">
                                {suggestion.suggestedValue}
                              </p>
                              <button
                                onClick={() => handleCopy(suggestion.suggestedValue, suggestion.id)}
                                title="Copiar sugestão"
                                className="p-1.5 text-purple-400 hover:text-white hover:bg-purple-600/30 rounded-md transition-colors shrink-0"
                              >
                                {copiedId === suggestion.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Rationale / Justificativa */}
                        <div className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 flex items-start gap-2">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[11px] leading-relaxed">{suggestion.rationale}</p>
                        </div>

                        {/* Action Apply Button */}
                        {rec.status === 'ACTIVE' && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleApply(rec.id, suggestion.id)}
                              disabled={applyingSuggestionId === suggestion.id}
                              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                            >
                              <CheckCircle2
                                className={`w-3.5 h-3.5 ${
                                  applyingSuggestionId === suggestion.id ? 'animate-spin' : ''
                                }`}
                              />
                              {applyingSuggestionId === suggestion.id ? 'Aplicando...' : 'Aplicar Sugestão'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
