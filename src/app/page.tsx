'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isDevelopment) {
      window.location.href = 'https://www.example.com'; // Replace with your main PHP site URL
    } else {
      router.push('/worker/dashboard');
    }
  }, [isDevelopment, router]);

  return null;
}