'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Smartphone,
  Wallet,
  Users,
  CheckCircle2,
  Lock,
  Cpu,
} from 'lucide-react';
import { api } from '@/lib/api';

export default function HomePage() {
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && api.getToken()) {
      setHasToken(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Navbar Superior */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-bold">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-lg tracking-tight">MGP</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Core v0.1
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {hasToken ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all"
              >
                Acessar Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all"
                >
                  Criar Conta
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 lg:py-28 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-8">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Fase 08 Homologada • Dashboard & Frontend Operacional
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl">
          A Plataforma Definitiva de{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Crescimento e Monetização
          </span>{' '}
          para Aplicativos Android
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
          Inteligência de mercado automatizada, rede soberana de troca de tráfego orgânico e monetização publicitária com segregação contábil estrita.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href={hasToken ? '/dashboard' : '/register'}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-xl shadow-blue-600/30 transition-all"
          >
            {hasToken ? 'Entrar no Painel' : 'Começar Gratuitamente'}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm transition-all"
          >
            Área de Membros
          </Link>
        </div>

        {/* 3 Pilares da Arquitetura */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
          {/* Pilar 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Inteligência Competitiva</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Monitore concorrentes, descubra tendências de palavras-chave na Google Play Store e posicione seu aplicativo no topo dos rankings.
            </p>
          </div>

          {/* Pilar 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Rede de Troca de Tráfego</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Troque impressões de anúncios com desenvolvedores parceiros em uma rede descentralizada e orgânica de aquisição de usuários.
            </p>
          </div>

          {/* Pilar 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-lg hover:border-slate-700 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 border border-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Carteira com Segregação</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              Livro-razão contábil de dupla entrada separando estritamente saldo publicitário, créditos de troca e receitas de publisher.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Mobile Growth Platform (MGP). Todos os direitos reservados.</p>
          <div className="flex items-center gap-6">
            <span>Next.js 14 App Router</span>
            <span>NestJS Core API</span>
            <span>Prisma ORM</span>
            <span>PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
