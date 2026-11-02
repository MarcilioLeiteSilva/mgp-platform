import React from 'react';
import { AuthProvider } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export default function AppDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AuthProvider>
  );
}
