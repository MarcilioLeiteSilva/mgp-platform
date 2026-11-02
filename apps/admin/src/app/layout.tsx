import React from 'react';

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
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}

