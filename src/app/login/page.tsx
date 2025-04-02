'use client';

import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingState />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginLoadingState() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-[120px] h-[120px] bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white">GR</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Login
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="animate-pulse space-y-6">
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-full"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-full mt-6"></div>
          </div>
        </div>
      </div>
    </div>
  );
} 