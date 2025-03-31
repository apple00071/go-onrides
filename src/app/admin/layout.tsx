'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import ClientAuthMiddleware from '@/app/auth-middleware';

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientAuthMiddleware requiredRole="admin">
      <AdminLayout>{children}</AdminLayout>
    </ClientAuthMiddleware>
  );
} 