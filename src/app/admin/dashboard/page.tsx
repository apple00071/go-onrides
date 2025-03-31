'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';

interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
    totalRevenue: number;
    pendingPayments: number;
    availableVehicles: number;
    maintenanceVehicles: number;
    totalCustomers: number;
  overdueBookings: number;
}

interface BookingWithDetails {
  id: string;
  customerName?: string;
  vehicleModel?: string;
  vehicleNumber?: string;
  start_date: string;
  end_date: string;
  amount: number;
  status: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const statsResponse = await fetch(`/api/admin/dashboard/stats?t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }

      const statsData = await statsResponse.json();
      if (!statsData.success) {
        throw new Error(statsData.message || 'Failed to fetch dashboard statistics');
      }

      setStats(statsData.data);

      // Fetch recent bookings
      const bookingsResponse = await fetch('/api/bookings?limit=5&sort=created_at&order=desc');
      if (!bookingsResponse.ok) {
        throw new Error('Failed to fetch recent bookings');
      }
      const bookingsData = await bookingsResponse.json();
      setRecentBookings(bookingsData.bookings || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
  return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <button
                    onClick={() => router.push('/admin/vehicles/new')}
                    className="text-lg font-medium text-gray-800 hover:text-indigo-600 transition-colors"
                  >
                    Add Vehicle
                  </button>
                  <p className="mt-1 text-sm text-gray-500">Add new vehicle to fleet</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <button
                    onClick={() => router.push('/admin/bookings')}
                    className="text-lg font-medium text-gray-800 hover:text-blue-600 transition-colors"
                  >
                    View Bookings
                  </button>
                  <p className="mt-1 text-sm text-gray-500">Manage all bookings</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <button
                    onClick={() => router.push('/admin/reports')}
                    className="text-lg font-medium text-gray-800 hover:text-emerald-600 transition-colors"
                  >
                    Reports
                  </button>
                  <p className="mt-1 text-sm text-gray-500">View analytics & reports</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-lg p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <button
                    onClick={() => router.push('/admin/users')}
                    className="text-lg font-medium text-gray-800 hover:text-fuchsia-600 transition-colors"
                  >
                    Manage Users
                  </button>
                  <p className="mt-1 text-sm text-gray-500">Manage staff accounts</p>
                </div>
              </div>
            </div>
          </div>
      </div>
      
        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
              <dd className="mt-2 flex items-baseline">
                <div className="text-3xl font-semibold text-gray-800">
                  {stats?.totalBookings || 0}
                </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-emerald-600">
                  <span>total</span>
                </div>
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500 truncate">Active Bookings</dt>
              <dd className="mt-2 flex items-baseline">
                <div className="text-3xl font-semibold text-gray-800">
                  {stats?.activeBookings || 0}
                </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-blue-600">
                  <span>active</span>
                </div>
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
              <dd className="mt-2 flex items-baseline">
                <div className="text-3xl font-semibold text-gray-800">
                  {formatCurrency(stats?.totalRevenue || 0)}
                </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-amber-600">
                  <span>revenue</span>
                </div>
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500 truncate">Pending Payments</dt>
              <dd className="mt-2 flex items-baseline">
                <div className="text-3xl font-semibold text-gray-800">
                  {formatCurrency(stats?.pendingPayments || 0)}
                </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-red-600">
                  <span>pending</span>
                </div>
              </dd>
            </div>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-medium text-gray-800">Recent Bookings</h2>
          </div>
          <div className="px-6 py-4">
            {recentBookings.length > 0 ? (
              <div className="-mx-6 -my-4 overflow-x-auto sm:-mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          Customer
                        </th>
                        <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          Bike Details
                        </th>
                        <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          Booking Period
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">
                          Status
                        </th>
                        <th scope="col" className="relative px-6 py-3 bg-gray-50">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {recentBookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                            {booking.customerName || 'Loading...'}
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {booking.vehicleModel || 'Loading...'} • {booking.vehicleNumber || 'XX-XX-XX'}
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatCurrency(booking.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                              className="text-orange-500 hover:text-orange-600 font-medium transition-colors"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-500 py-4">No recent bookings found</p>
          )}
        </div>
      </div>
      </main>
    </div>
  );
} 