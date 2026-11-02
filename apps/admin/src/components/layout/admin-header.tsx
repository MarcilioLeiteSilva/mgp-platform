'use client';

import React from 'react';
import { ShieldCheck, Database, HardDrive, RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function AdminHeader() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-slate-950 border-b border-slate-800/80 px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            NOC Operational Center
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span>PostgreSQL 16: Conectado</span>
        </div>

        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
          <HardDrive className="w-3.5 h-3.5 text-amber-400" />
          <span>Redis Cache: Online</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          SUPERADMIN
        </span>

        <div className="w-8 h-8 rounded-full bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-xs">
          {user?.fullName ? user.fullName[0].toUpperCase() : 'A'}
        </div>
      </div>
    </header>
  );
}
