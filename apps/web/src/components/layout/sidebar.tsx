'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Smartphone,
  Wallet,
  Users,
  Settings,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  Megaphone,
  LayoutGrid,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const navigationItems = [
  {
    name: 'Visão Geral',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Meus Aplicativos',
    href: '/apps',
    icon: Smartphone,
  },
  {
    name: 'Blocos de Anúncios',
    href: '/ad-units',
    icon: LayoutGrid,
  },
  {
    name: 'Campanhas',
    href: '/campaigns',
    icon: Megaphone,
  },
  {
    name: 'ASO Studio',
    href: '/aso',
    icon: Sparkles,
  },
  {
    name: 'Carteira & Finanças',
    href: '/wallet',
    icon: Wallet,
  },
  {
    name: 'Organização & Membros',
    href: '/organization',
    icon: Users,
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { currentOrg } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-400 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-white tracking-wide text-base flex items-center gap-1.5">
            MGP
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
              v0.1
            </span>
          </div>
          <p className="text-xs text-slate-400">Mobile Growth</p>
        </div>
      </div>

      {/* Tenant Indicator */}
      {currentOrg && (
        <div className="px-4 py-3 mx-3 my-3 rounded-lg bg-slate-800/60 border border-slate-700/60 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">Tenant Ativo</p>
            <p className="text-sm font-semibold text-white truncate">{currentOrg.name}</p>
          </div>
          <span className="shrink-0 text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {currentOrg.role}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-2">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Menu Principal
        </div>
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* System Status Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>API Online</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>RBAC 2.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

