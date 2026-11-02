import React from 'react';
import './globals.css';

export const metadata = {
  title: 'MGP — Mobile Growth Platform',
  description: 'Inteligência de Mercado, Ad Network e Monetização para Apps Android',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
