'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Sparkles,
  Download,
  DollarSign,
  ShieldCheck,
  Info,
  Calendar,
  Layers,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { AsoEstimatesSummaryDto, AsoAppEstimateDto } from '@mgp/contracts';

interface PredictiveEstimatesProps {
  asoAppId: string;
  app: any;
}

export function PredictiveEstimates({ asoAppId, app }: PredictiveEstimatesProps) {
  const [summary, setSummary] = useState<AsoEstimatesSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [chartMetric, setChartMetric] = useState<'downloads' | 'revenue'>('downloads');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchEstimates = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.get<AsoEstimatesSummaryDto>(
        `/api/v1/aso/apps/${asoAppId}/estimates?days=30`,
      );
      const data = res?.data || (res as any);
      if (data && data.latestEstimate) {
        setSummary(data);
      }
    } catch (err: any) {
      console.error('Falha ao carregar estimativas preditivas:', err);
    } finally {
      setIsLoading(false);
    }
  }, [asoAppId]);

  useEffect(() => {
    fetchEstimates();
  }, [fetchEstimates]);

  const handleRecalculate = async () => {
    try {
      setIsRecalculating(true);
      await api.post(`/api/v1/aso/apps/${asoAppId}/estimates/recalculate`, {
        country: app?.country || 'BR',
      });
      setToastMessage('Estimativas recalculadas com sucesso!');
      await fetchEstimates();
    } catch (err: any) {
      setToastMessage('Erro ao recalcular: ' + (err.message || 'Falha na requisição'));
    } finally {
      setIsRecalculating(false);
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-white">Processando Modelagem Preditiva...</p>
        <p className="text-xs text-slate-400 mt-1">
          Calculando curvas de Pareto, tração de downloads e estimativa de receita setorial.
        </p>
      </div>
    );
  }

  if (!summary || !summary.latestEstimate) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
        <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-300">Estimativas não disponíveis no momento</p>
        <button
          onClick={handleRecalculate}
          disabled={isRecalculating}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
          Gerar Primeira Projeção
        </button>
      </div>
    );
  }

  const { latestEstimate, history, growthTrends, methodologyNotice } = summary;
  const historyData = history && history.length > 0 ? history : [latestEstimate];

  // Helper de Formatação
  const formatNumber = (num: number) => new Intl.NumberFormat('pt-BR').format(num);
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // SVG Chart Setup
  const chartW = 760;
  const chartH = 260;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;
  const plotW = chartW - padLeft - padRight;
  const plotH = chartH - padTop - padBottom;

  const getMetricValues = (item: AsoAppEstimateDto) => {
    if (chartMetric === 'downloads') {
      return {
        min: item.dailyDownloads.min,
        median: item.dailyDownloads.median,
        max: item.dailyDownloads.max,
      };
    }
    return {
      min: item.dailyRevenue.min,
      median: item.dailyRevenue.median,
      max: item.dailyRevenue.max,
    };
  };

  const allMaxValues = historyData.map((d) => getMetricValues(d).max);
  const allMinValues = historyData.map((d) => getMetricValues(d).min);
  const maxVal = Math.max(10, ...allMaxValues) * 1.1;
  const minVal = 0;
  const valRange = maxVal - minVal || 1;

  const getX = (idx: number) => {
    if (historyData.length === 1) return padLeft + plotW / 2;
    return padLeft + (idx / (historyData.length - 1)) * plotW;
  };

  const getY = (val: number) => {
    return padTop + plotH - ((val - minVal) / valRange) * plotH;
  };

  const points = historyData.map((item, idx) => {
    const { min, median, max } = getMetricValues(item);
    return {
      x: getX(idx),
      yMedian: getY(median),
      yMin: getY(min),
      yMax: getY(max),
      min,
      median,
      max,
      date: item.date,
      formattedDate: new Date(item.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
    };
  });

  // Linha da mediana
  const medianPathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.yMedian}` : `${acc} L ${p.x} ${p.yMedian}`), '');

  // Faixa sombreada de intervalo de confianÃ§a [Max a Min]
  const maxPathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.yMax}` : `${acc} L ${p.x} ${p.yMax}`), '');
  const minReversedPathD = [...points].reverse().reduce((acc, p) => `${acc} L ${p.x} ${p.yMin}`, '');
  const confidenceBandD = `${maxPathD} ${minReversedPathD} Z`;

  // Cor do grÃ¡fico conforme mÃ©trica
  const isRevenue = chartMetric === 'revenue';
  const strokeColor = isRevenue ? '#10b981' : '#3b82f6';
  const bandFill = isRevenue ? 'rgba(16, 185, 129, 0.14)' : 'rgba(59, 130, 246, 0.14)';

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="bg-slate-900 border border-emerald-500/30 text-emerald-400 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-white text-base">Inteligência de Mercado & Estimativas Preditivas</h3>
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold">
              Power-Law / Pareto
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono uppercase">
              {summary.country}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Projeções de downloads e faturamento calibradas por categoria setorial ({latestEstimate.category}) e velocidade de reviews.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Confidence Badge */}
          <div className="bg-slate-950 border border-slate-800 px-3.5 py-1.5 rounded-lg flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-mono leading-none">Confiança</span>
              <span className="text-xs font-bold text-emerald-400">{latestEstimate.confidenceScore}%</span>
            </div>
          </div>

          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span>Recalcular Projeção</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Downloads Diários */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Downloads Diários (P50)</span>
            <Download className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {formatNumber(latestEstimate.dailyDownloads.median)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span>
              Faixa: {formatNumber(latestEstimate.dailyDownloads.min)} â€“ {formatNumber(latestEstimate.dailyDownloads.max)}
            </span>
            {growthTrends.downloadGrowthRate7d !== 0 && (
              <span
                className={`font-mono font-semibold flex items-center gap-0.5 ${
                  growthTrends.downloadGrowthRate7d >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {growthTrends.downloadGrowthRate7d >= 0 ? '+' : ''}
                {growthTrends.downloadGrowthRate7d}% 7d
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Projeção Mensal Downloads */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Downloads Mensais Projetados</span>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {formatNumber(latestEstimate.monthlyDownloads.median)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span>
              Faixa: {formatNumber(latestEstimate.monthlyDownloads.min)} â€“ {formatNumber(latestEstimate.monthlyDownloads.max)}
            </span>
            {growthTrends.downloadGrowthRate30d !== 0 && (
              <span
                className={`font-mono font-semibold flex items-center gap-0.5 ${
                  growthTrends.downloadGrowthRate30d >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {growthTrends.downloadGrowthRate30d >= 0 ? '+' : ''}
                {growthTrends.downloadGrowthRate30d}% 30d
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Receita Diária Estimada */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Receita Diária Estimada</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {formatCurrency(latestEstimate.dailyRevenue.median)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span>
              Faixa: {formatCurrency(latestEstimate.dailyRevenue.min)} â€“ {formatCurrency(latestEstimate.dailyRevenue.max)}
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {latestEstimate.breakdown?.monetizationType || 'IAP'}
            </span>
          </div>
        </div>

        {/* Card 4: Receita Mensal Projetada */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-xs font-medium">Receita Mensal Projetada</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {formatCurrency(latestEstimate.monthlyRevenue.median)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            <span>
              Faixa: {formatCurrency(latestEstimate.monthlyRevenue.min)} â€“ {formatCurrency(latestEstimate.monthlyRevenue.max)}
            </span>
            {growthTrends.revenueGrowthRate30d !== 0 && (
              <span
                className={`font-mono font-semibold flex items-center gap-0.5 ${
                  growthTrends.revenueGrowthRate30d >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {growthTrends.revenueGrowthRate30d >= 0 ? '+' : ''}
                {growthTrends.revenueGrowthRate30d}% 30d
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-800/80">
          <div>
            <h4 className="font-bold text-white text-sm">
              Série Temporal & Intervalo de Confiança (Ãltimos 30 dias)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Linha contínua: Mediana P50 Â· Faixa sombreada: Intervalo de Confiança P10 a P90
            </p>
          </div>

          {/* Toggle Downloads vs Receita */}
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setChartMetric('downloads')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                chartMetric === 'downloads'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Downloads</span>
            </button>
            <button
              onClick={() => setChartMetric('revenue')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                chartMetric === 'revenue'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Receita (BRL)</span>
            </button>
          </div>
        </div>

        {/* SVG Chart Rendering */}
        <div className="relative w-full overflow-x-auto">
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto select-none overflow-visible">
            <defs>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {/* Gridlines Horizontais */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
              const yPos = padTop + plotH * (1 - ratio);
              const gridVal = minVal + valRange * ratio;
              return (
                <g key={i}>
                  <line
                    x1={padLeft}
                    y1={yPos}
                    x2={chartW - padRight}
                    y2={yPos}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 10}
                    y={yPos + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {isRevenue
                      ? `R$ ${(gridVal / 1000).toFixed(1)}k`
                      : gridVal >= 1000
                      ? `${(gridVal / 1000).toFixed(1)}k`
                      : Math.round(gridVal)}
                  </text>
                </g>
              );
            })}

            {/* Faixa Sombreada de Confiança [P10 - P90] */}
            {points.length > 1 && (
              <path d={confidenceBandD} fill="url(#bandGrad)" />
            )}

            {/* Linha Central da Mediana */}
            {points.length > 1 && (
              <path d={medianPathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
            )}

            {/* Pontos Interativos com Hover */}
            {points.map((p, i) => {
              const isHovered = hoveredIndex === i;
              return (
                <g
                  key={i}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={p.x}
                    cy={p.yMedian}
                    r={isHovered ? 6 : 3.5}
                    fill="#0f172a"
                    stroke={strokeColor}
                    strokeWidth={isHovered ? 3 : 2}
                  />

                  {/* Rótulo de Data no eixo X (amostragem a cada 5 pontos) */}
                  {(i === 0 || i === points.length - 1 || i % 6 === 0) && (
                    <text
                      x={p.x}
                      y={chartH - 12}
                      textAnchor="middle"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {p.formattedDate}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Tooltip Dinâmico */}
            {hoveredIndex !== null && points[hoveredIndex] && (
              <g
                transform={`translate(${Math.min(
                  chartW - padRight - 150,
                  Math.max(padLeft, points[hoveredIndex].x - 75),
                )}, ${Math.max(10, points[hoveredIndex].yMedian - 85)})`}
              >
                <rect
                  width="150"
                  height="72"
                  rx="6"
                  fill="#020617"
                  stroke="#334155"
                  strokeWidth="1"
                  filter="drop-shadow(0 4px 6px rgba(0, 0, 0, 0.4))"
                />
                <text x="12" y="18" fill="#94a3b8" fontSize="10" fontWeight="bold">
                  Data: {points[hoveredIndex].formattedDate}
                </text>
                <text x="12" y="34" fill={strokeColor} fontSize="11" fontWeight="bold" fontFamily="monospace">
                  Mediana: {isRevenue ? formatCurrency(points[hoveredIndex].median) : formatNumber(points[hoveredIndex].median)}
                </text>
                <text x="12" y="49" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  P10 (Min): {isRevenue ? formatCurrency(points[hoveredIndex].min) : formatNumber(points[hoveredIndex].min)}
                </text>
                <text x="12" y="63" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                  P90 (Max): {isRevenue ? formatCurrency(points[hoveredIndex].max) : formatNumber(points[hoveredIndex].max)}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Methodology & Compliance Box */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-300">Nota Metodológica e Transparência:</p>
          <p className="leading-relaxed">
            {methodologyNotice}
          </p>
        </div>
      </div>
    </div>
  );
}

