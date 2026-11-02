'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Building2,
  Users,
  Smartphone,
  ShieldAlert,
  Cpu,
  Server,
  LogOut,
  Radio,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

const navigationItems = [
  {
    name: 'NOC / Visão Geral',
    href: '/',
    icon: Activity,
  },
  {
    name: 'Organizações',
    href: '/organizations',
    icon: Building2,
  },
  {
    name: 'Usuários Globais',
    href: '/users',
    icon: Users,
  },
  {
    name: 'Aplicativos & Moderação',
    href: '/apps',
    icon: Smartphone,
  },
  {
    name: 'Auditoria & Logs',
    href: '/audit-logs',
    icon: ShieldAlert,
  },
  {
    name: 'Infraestrutura & Filas',
    href: '/system',
    icon: Cpu,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800/80 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800/80 bg-slate-900/40">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20">
          <Server className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-white tracking-wide text-sm flex items-center gap-1.5">
            MGP NOC
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
              Backoffice
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Operações Centrais</p>
        </div>
      </div>

      {/* Indicador de Status do Superadmin */}
      <div className="px-4 py-3 mx-3 my-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Operador NOC</p>
          <p className="text-xs font-semibold text-white truncate">{user?.fullName || user?.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto mt-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Gestão Global
        </div>
        {navigationItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-red-600 text-white shadow-sm shadow-red-600/30 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer com Status da Rede e Botão Sair */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/30 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">Telemetria Ativa</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">v0.1.0</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          Encerrar Sessão NOC
        </button>
      </div>
    </aside>
  );
}
