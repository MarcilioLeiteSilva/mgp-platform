'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';

export interface RankingHistoryPoint {
  rank: number;
  recordedAt: string | Date;
}

interface RankingChartProps {
  keyword: string;
  currentRank?: number | null;
  bestRank?: number | null;
  history: RankingHistoryPoint[];
  days?: number;
}

export function RankingChart({
  keyword,
  currentRank,
  bestRank,
  history,
  days = 30,
}: RankingChartProps) {
  if (!history || history.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium">Sem dados históricos acumulados</p>
        <p className="text-xs text-slate-500 mt-1">
          A série temporal de posições para "{keyword}" será construída conforme as sincronizações diárias ocorrerem.
        </p>
      </div>
    );
  }

  // Ordena cronologicamente
  const sorted = [...history].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  const width = 640;
  const height = 240;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 25;
  const padBottom = 35;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Em gráficos de ASO/SEO, a melhor posição (#1) fica no TOPO.
  const ranks = sorted.map((p) => p.rank);
  const minRank = Math.max(1, Math.min(...ranks));
  const maxRank = Math.max(10, Math.max(...ranks));

  const rankRange = maxRank - minRank || 1;

  // Mapeamento: minRank (ex: 1) -> padTop (topo do gráfico), maxRank -> padTop + chartH
  const getX = (index: number) => {
    if (sorted.length === 1) return padLeft + chartW / 2;
    return padLeft + (index / (sorted.length - 1)) * chartW;
  };

  const getY = (rank: number) => {
    return padTop + ((rank - minRank) / rankRange) * chartH;
  };

  const points = sorted.map((p, i) => ({
    x: getX(i),
    y: getY(p.rank),
    rank: p.rank,
    date: new Date(p.recordedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    rawDate: p.recordedAt,
  }));

  const pathD = points.reduce((acc, curr, i) => {
    return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${
    height - padBottom
  } Z`;

  // Variação entre primeiro e último ponto
  const firstRank = sorted[0].rank;
  const lastRank = sorted[sorted.length - 1].rank;
  const diff = firstRank - lastRank; // positivo significa subiu posições

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">Evolução de Ranking:</h3>
            <span className="px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold text-sm">
              "{keyword}"
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">Histórico dos últimos {days} dias na Google Play Store</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase">Posição Atual</span>
            <span className="font-bold text-emerald-400 text-sm">{currentRank ? `#${currentRank}` : 'Fora do top 100'}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase">Melhor Rank</span>
            <span className="font-bold text-amber-400 text-sm">{bestRank ? `#${bestRank}` : '—'}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[10px] uppercase">Tendência</span>
            <div className="flex items-center gap-1 font-semibold text-sm">
              {diff > 0 ? (
                <span className="text-emerald-400 flex items-center">
                  <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{diff}
                </span>
              ) : diff < 0 ? (
                <span className="text-rose-400 flex items-center">
                  <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {diff}
                </span>
              ) : (
                <span className="text-slate-400 flex items-center">
                  <Minus className="w-3.5 h-3.5 mr-0.5" /> 0
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[500px]">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines horizontais */}
          {[minRank, Math.round((minRank + maxRank) / 2), maxRank].map((rValue, i) => {
            const yPos = getY(rValue);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={width - padRight}
                  y2={yPos}
                  stroke="#334155"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={yPos + 4}
                  fill="#94a3b8"
                  fontSize="11"
                  textAnchor="end"
                  fontFamily="monospace"
                >
                  #{rValue}
                </text>
              </g>
            );
          })}

          {/* Área sombreada */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Linha de Traçado */}
          <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Pontos de dados e tooltips visuais */}
          {points.map((p, i) => (
            <g key={i} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="4.5"
                className="fill-blue-500 stroke-slate-900 group-hover:fill-emerald-400 transition-colors"
                strokeWidth="2"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                className="fill-transparent"
              />
              {/* Rótulo de data no eixo X */}
              {(i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2)) && (
                <text
                  x={p.x}
                  y={height - padBottom + 16}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {p.date}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 font-mono">
        <span>* O eixo vertical é invertido: posições mais próximas do topo (#1) indicam liderança na busca.</span>
        <span>Amostras: {sorted.length} snapshots</span>
      </div>
    </div>
  );
}

