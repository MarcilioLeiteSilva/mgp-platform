'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AdminSidebar } from './admin-sidebar';
import { AdminHeader } from './admin-header';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && (!user || !user.isSuperadmin) && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-xs font-mono uppercase tracking-wider">
          Autenticando Acesso NOC...
        </p>
      </div>
    );
  }

  if (!user || !user.isSuperadmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
