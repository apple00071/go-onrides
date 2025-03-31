'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isDevelopment) {
      // In production, redirect to the main PHP site
      window.location.href = 'https://go-onriders.com';
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-orange-600">
                Go On Riders
              </Link>
            </div>
            <nav className="flex items-center space-x-8">
              <Link href="/" className="text-gray-700 hover:text-gray-900">
                Home
              </Link>
              <Link href="/vehicles" className="text-gray-700 hover:text-gray-900">
                Vehicles
              </Link>
              <Link href="/about-us" className="text-gray-700 hover:text-gray-900">
                About Us
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-gray-900">
                Contact
              </Link>
              <Link
                href="/admin"
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
              >
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow">
        <div className="bg-[#cc2200] text-white py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="text-5xl font-bold mb-6">Go On Riders</h1>
              <p className="text-xl mb-8">
                Rent bikes, cars, and more for your daily commute or adventure trips. We offer
                affordable rates with flexible booking periods.
              </p>
              <div className="flex gap-4">
                <Link
                  href="/vehicles"
                  className="bg-white text-orange-600 px-6 py-3 rounded-md font-medium hover:bg-gray-50"
                >
                  Explore Vehicles
                </Link>
                <Link
                  href="/admin"
                  className="bg-[#8B0000] text-white px-6 py-3 rounded-md font-medium hover:bg-[#7A0000]"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Development Mode Notice */}
        {isDevelopment && (
          <div className="bg-yellow-50 border-t border-yellow-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <p className="text-yellow-800 text-sm">
                <strong>Development Mode:</strong> In production, this page will redirect to the main PHP site at https://go-onriders.com.
                The Next.js app will only handle /admin and /worker routes.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}