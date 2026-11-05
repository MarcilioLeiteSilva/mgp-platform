'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface AuditGaugeProps {
  overallScore: number;
  titleScore: number;
  shortDescriptionScore: number;
  longDescriptionScore: number;
  iconScore: number;
  screenshotsScore: number;
  ratingsScore: number;
  auditDate?: string;
}

export function AuditGauge({
  overallScore,
  titleScore,
  shortDescriptionScore,
  longDescriptionScore,
  iconScore,
  screenshotsScore,
  ratingsScore,
  auditDate,
}: AuditGaugeProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return { text: 'text-emerald-400', stroke: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    if (score >= 60) return { text: 'text-amber-400', stroke: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
    return { text: 'text-rose-400', stroke: '#f43f5e', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
  };

  const getScoreStatus = (score: number) => {
    if (score >= 90) return 'Excelente Otimização';
    if (score >= 80) return 'Boa Otimização';
    if (score >= 60) return 'Oportunidades de Melhoria';
    return 'Otimização Crítica';
  };

  const colors = getScoreColor(overallScore);
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overallScore / 100) * circumference;

  const categories = [
    { label: 'Título do App', score: titleScore, weight: '25%', maxChars: '30 chars' },
    { label: 'Descrição Curta', score: shortDescriptionScore, weight: '15%', maxChars: '80 chars' },
    { label: 'Descrição Completa', score: longDescriptionScore, weight: '20%', maxChars: '4000 chars' },
    { label: 'Ícone de Alta Resolução', score: iconScore, weight: '10%', maxChars: '512x512' },
    { label: 'Screenshots & Mídia', score: screenshotsScore, weight: '15%', maxChars: '5 a 8 prints' },
    { label: 'Avaliações & Prova Social', score: ratingsScore, weight: '15%', maxChars: 'Nota ≥ 4.2' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row items-center gap-8">
        {/* Mostrador Circular */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r={radius}
                className="text-slate-800"
                strokeWidth="12"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r={radius}
                stroke={colors.stroke}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className={`text-4xl font-extrabold ${colors.text}`}>{overallScore}</span>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Score ASO</span>
            </div>
          </div>

          <div className={`mt-3 px-3 py-1 rounded-full text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
            {getScoreStatus(overallScore)}
          </div>

          {auditDate && (
            <p className="text-[11px] text-slate-500 mt-2">
              Auditado em: {new Date(auditDate).toLocaleDateString('pt-BR')} às {new Date(auditDate).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Barras de Desempenho por Categoria */}
        <div className="flex-1 w-full space-y-3.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Desdobramento por Fator de Ranqueamento
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {categories.map((cat) => {
              const catColor = getScoreColor(cat.score);
              return (
                <div key={cat.label} className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/80">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-200">{cat.label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">Peso: {cat.weight}</span>
                      <span className={`font-bold ${catColor.text}`}>{cat.score}/100</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.score}%`,
                        backgroundColor: catColor.stroke,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1 font-mono">
                    <span>Meta: {cat.maxChars}</span>
                    <span>{cat.score >= 80 ? 'Otimizado' : 'Requer Atenção'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

