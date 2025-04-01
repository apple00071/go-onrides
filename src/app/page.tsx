'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function Home() {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    // Get the correct app URL from environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://goonriders.vercel.app';
    
    if (isDevelopment) {
      // In development, redirect to worker dashboard
      router.push('/worker/dashboard');
    } else {
      // In production, redirect to login page
      router.push('/login');
    }
  }, [isDevelopment, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}