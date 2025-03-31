'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function RentalsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/bookings');
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <LoadingSpinner size="lg" />
    </div>
  );
} 