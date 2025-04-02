'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Booking, Vehicle, Customer, Permission } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

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

interface BookingWithDetails extends Booking {
  customer_name?: string;
  vehicle_model?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  amount?: number;
  payment_status?: string;
}

// Define the tab types for the dashboard
type TabType = 'bookings' | 'bikes' | 'customers' | 'payments';

export default function WorkerDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBookings, setRecentBookings] = useState<BookingWithDetails[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const hasPermission = (permission: Permission) => {
    // Fall back to role-based permission if no explicit permissions
    return Boolean(
      user?.permissions?.includes(permission) || 
      user?.permissions?.includes('*') || 
      user?.role === 'admin'
    );
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard stats
      const statsResponse = await fetch('/api/worker/dashboard/stats', {
        credentials: 'include'
      });

      if (!statsResponse.ok) {
        throw new Error('Failed to fetch dashboard statistics');
      }

      const statsData = await statsResponse.json();
      if (!statsData.success) {
        throw new Error(statsData.error || 'Failed to fetch dashboard statistics');
      }

      setStats(statsData.data);

      // Fetch recent bookings
      const bookingsResponse = await fetch('/api/bookings?limit=5', {
        credentials: 'include'
      });
      
      if (!bookingsResponse.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const bookingsData = await bookingsResponse.json();
      if (!bookingsData.success) {
        throw new Error(bookingsData.error || 'Failed to fetch bookings');
      }

      setRecentBookings(bookingsData.bookings || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBooking = async (bookingId: string) => {
    try {
      setLoading(true);
      const remarks = window.prompt('Please enter any remarks about the return:');
      
      if (remarks === null) {
        setLoading(false);
        return; // User cancelled
      }

      const response = await fetch(`/api/bookings/${bookingId}/return`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remarks }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process return');
      }

      await fetchDashboardData();
      toast.success('Vehicle returned successfully');
    } catch (error) {
      console.error('Error returning vehicle:', error);
      toast.error('Failed to process return');
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <ErrorAlert message={error} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-3">
                  <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                    <button
                      onClick={() => router.push('/worker/bookings/new')}
                    className="text-lg font-medium text-gray-800 hover:text-orange-600 transition-colors"
                    >
                      New Booking
                    </button>
                  <p className="mt-1 text-sm text-gray-500">Create a new booking</p>
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
                    onClick={() => router.push('/worker/customers/search')}
                    className="text-lg font-medium text-gray-800 hover:text-blue-600 transition-colors"
                  >
                    Find Customer
                  </button>
                  <p className="mt-1 text-sm text-gray-500">Search customer records</p>
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
                    onClick={() => router.push('/worker/returns')}
                    className="text-lg font-medium text-gray-800 hover:text-emerald-600 transition-colors"
                  >
                    Return Bike
                  </button>
                  <p className="mt-1 text-sm text-gray-500">Process bike returns</p>
                </div>
              </div>
            </div>
                  </div>
                  </div>

        {/* Stats Overview */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500">Bikes Booked</dt>
              <dd className="mt-2 flex items-baseline">
                <div className="text-3xl font-semibold text-gray-800">
                  {stats?.activeBookings || 0}
                </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-emerald-600">
                  <span>active now</span>
                </div>
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
              <div className="p-5">
              <dt className="text-sm font-medium text-gray-500">Available Bikes</dt>
              <dd className="mt-2 flex items-baseline">
                <div className="text-3xl font-semibold text-gray-800">
                  {stats?.availableVehicles || 0}
                </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-blue-600">
                  <span>available</span>
                </div>
              </dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500">Due Returns</dt>
              <dd className="mt-2 flex items-baseline">
                <div className="text-3xl font-semibold text-gray-800">
                  {stats?.overdueBookings || 0}
          </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-amber-600">
                  <span>pending</span>
                            </div>
              </dd>
                          </div>
                        </div>
          <div className="bg-white overflow-hidden rounded-xl border border-gray-100 transition-all hover:shadow-lg hover:border-gray-200">
            <div className="p-5">
              <dt className="text-sm font-medium text-gray-500">Today's Revenue</dt>
              <dd className="mt-2 flex items-baseline">
                <div className="text-3xl font-semibold text-gray-800">
                  {formatCurrency(stats?.totalRevenue || 0)}
                          </div>
                <div className="ml-2 flex items-baseline text-sm font-semibold text-emerald-600">
                  <span>today</span>
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
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Bike Details
                  </th>
                  <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Booking Period
                  </th>
                  <th className="px-6 py-3 border-b border-gray-200 bg-gray-50 text-left text-xs leading-4 font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 border-b border-gray-200 bg-gray-50"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentBookings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                      No recent bookings found
                    </td>
                  </tr>
                ) : (
                  recentBookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {booking.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {booking.vehicle_model} • {booking.vehicle_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/worker/bookings/${booking.id}`}
                          className="text-orange-600 hover:text-orange-900"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
} 