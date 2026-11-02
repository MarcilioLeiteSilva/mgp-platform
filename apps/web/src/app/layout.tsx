import React from 'react';

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
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}

