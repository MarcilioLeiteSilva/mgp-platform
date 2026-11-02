import React from 'react';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { AdminLayout } from '@/components/layout/admin-layout';

export const metadata = {
  title: 'MGP NOC — Painel Administrativo Global',
  description: 'NOC e Backoffice da Mobile Growth Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased selection:bg-red-600 selection:text-white">
        <AuthProvider>
          <AdminLayout>{children}</AdminLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
