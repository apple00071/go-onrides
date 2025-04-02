'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get('from') || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store user data in localStorage to maintain session
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        toast.success('Login successful');
        
        // Redirect to the original path or homepage
        router.push(redirectPath);
      } else {
        throw new Error('User data not received from server');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if user is already logged in
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        // If we already have a user, redirect
        const user = JSON.parse(userStr);
        if (user.role) {
          router.push(redirectPath);
        }
      } catch (e) {
        // If there's an issue with the stored user data, clear it
        localStorage.removeItem('user');
      }
    }
  }, [redirectPath, router]);

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
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username or Email
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or email"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            {redirectPath !== '/' && (
              <div className="text-sm text-gray-600 text-center">
                You'll be redirected back after login
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                  ${isLoading ? 'bg-orange-400' : 'bg-orange-600 hover:bg-orange-700'}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500`}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 