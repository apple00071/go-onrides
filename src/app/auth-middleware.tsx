'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ClientAuthMiddlewareProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'worker';
}

export default function ClientAuthMiddleware({
  children,
  requiredRole,
}: ClientAuthMiddlewareProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // If still loading authentication state, wait for it
    if (loading) {
      return;
    }

    // Check if we're on login/register page
    const isAuthPage = pathname === '/login' || pathname === '/register';

    // Logic to handle different auth scenarios
    const performAuthCheck = () => {
      // If authenticated and on auth page, redirect to appropriate dashboard
      if (user && isAuthPage) {
        router.push(user.role === 'admin' ? '/admin/dashboard' : '/worker/dashboard');
        return;
      }

      // If not authenticated and not on auth page, redirect to login
      if (!user && !isAuthPage) {
        router.push(`/login?from=${encodeURIComponent(pathname || '')}`);
        return;
      }

      // Handle worker trying to access admin area
      if (user?.role === 'worker' && pathname?.startsWith('/admin')) {
        router.push('/worker/dashboard');
        return;
      }

      // Handle admin trying to access worker area
      if (user?.role === 'admin' && pathname?.startsWith('/worker')) {
        router.push('/admin/dashboard');
        return;
      }

      // Check if user has the required role
      if (user && requiredRole && user.role !== requiredRole) {
        if (user.role === 'worker') {
          // Show notification for workers about contacting admin
          router.push('/unauthorized?message=Please contact your administrator for access to this page.');
        } else {
          router.push('/unauthorized');
        }
        return;
      }

      // If we get here, no redirects were needed
      setIsVerifying(false);
    };

    performAuthCheck();
  }, [user, loading, pathname, router, requiredRole]); // Removed isVerifying from dependencies

  // Show loading spinner while verifying auth
  if (loading || isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
} 