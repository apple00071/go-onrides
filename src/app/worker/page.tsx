'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function WorkerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/worker/dashboard');
  }, [router]);

  return <LoadingSpinner />;
} 