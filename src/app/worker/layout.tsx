'use client';

import WorkerLayout from '@/components/layouts/WorkerLayout';
import ClientAuthMiddleware from '@/app/auth-middleware';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import type { Permission } from '@/types';

const pagePermissionMap: Record<string, Permission> = {
  'dashboard': 'dashboard.stats',
  'customers': 'customers.view',
  'customers/[id]': 'customers.view',
  'customers/[id]/edit': 'customers.update',
  'vehicles': 'vehicles.view',
  'vehicles/[id]': 'vehicles.view',
  'vehicles/[id]/edit': 'vehicles.update',
  'bookings': 'bookings.view',
  'bookings/[id]': 'bookings.view',
  'bookings/[id]/edit': 'bookings.update',
  'settings': 'settings.view',
  'settings/edit': 'settings.update'
};

export default function WorkerRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Check if the worker has access to this page
  const checkAccess = () => {
    console.log('Checking access for user:', user);
    if (!user || user.role !== 'worker') {
      console.log('Access denied: No user or not a worker');
      return false;
    }

    const permissions = user.permissions || [];
    console.log('User permissions:', permissions);
    
    const path = pathname?.split('/worker/')[1] || '';
    console.log('Current path:', path);

    // Allow access to root worker page
    if (!path || path === '') {
      console.log('Access granted: Root worker page');
      return true;
    }

    // Handle dashboard path directly
    if (path === 'dashboard') {
      const hasDashboardAccess = permissions.includes('dashboard.stats') || permissions.includes('*');
      console.log('Dashboard access:', hasDashboardAccess);
      return hasDashboardAccess;
    }

    // Split the path into segments
    const pathSegments = path.split('/');
    console.log('Path segments:', pathSegments);
    
    // Try to match the path pattern
    const matchingPattern = Object.keys(pagePermissionMap).find(pattern => {
      const patternSegments = pattern.split('/');
      console.log('Checking pattern:', pattern, 'segments:', patternSegments);
      
      if (patternSegments.length !== pathSegments.length) {
        console.log('Length mismatch for pattern:', pattern);
        return false;
      }
      
      return patternSegments.every((segment, index) => {
        // If segment is a parameter (e.g., [id]), it matches anything
        if (segment.startsWith('[') && segment.endsWith(']')) return true;
        return segment === pathSegments[index];
      });
    });

    console.log('Matching pattern:', matchingPattern);
    if (!matchingPattern) {
      console.log('Access denied: No matching pattern found');
      return false;
    }

    const requiredPermission = pagePermissionMap[matchingPattern];
    console.log('Required permission:', requiredPermission);

    const hasPermission = permissions.includes(requiredPermission) || permissions.includes('*');
    console.log('Has permission:', hasPermission);
    return hasPermission;
  };

  return (
    <ClientAuthMiddleware requiredRole="worker">
      <WorkerLayout>
        {checkAccess() ? children : (
          <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
              <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    Access Restricted
                  </h2>
                  <p className="text-gray-600 mb-6">
                    You don't have permission to access this page. Please contact your administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </WorkerLayout>
    </ClientAuthMiddleware>
  );
} 