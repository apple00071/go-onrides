'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { formatDate, formatCurrency } from '@/lib/format';
import { getStatusColor } from '@/lib/utils';
import Link from 'next/link';
import { Booking } from '@/types';
import ErrorAlert from '@/components/ui/ErrorAlert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';

interface EnhancedBooking extends Booking {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_model: string;
  vehicle_type: string;
  vehicle_number: string;
  payment_status: string;
}

export default function BookingDetailsPage() {
  const params = useParams();
  const [booking, setBooking] = useState<EnhancedBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingDetails();
  }, []);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      const data = await response.json();
      setBooking(data.booking);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBooking = async () => {
    try {
      setLoading(true);
      const remarks = window.prompt('Please enter any remarks about the return:');
      
      if (remarks === null) {
        setLoading(false);
        return; // User cancelled
      }

      const response = await fetch(`/api/bookings/${params.id}/return`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remarks }),
      });

      if (!response.ok) {
        throw new Error('Failed to process return');
      }

      await fetchBookingDetails();
      toast.success('Vehicle returned successfully');
    } catch (error) {
      console.error('Error returning vehicle:', error);
      toast.error('Failed to process return');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!booking) {
    return <ErrorAlert message="Booking not found" />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-base font-semibold leading-6 text-gray-900">
            Booking Details
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Detailed information about the booking and its current status.
          </p>
        </div>
        <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none space-x-3">
          {booking.status === 'active' && (
            <button
              onClick={handleReturnBooking}
              className="rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              Return Vehicle
            </button>
          )}
          {booking.status !== 'completed' && booking.status !== 'cancelled' && (
            <Link
              href={`/worker/bookings/${booking.id}/edit`}
              className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Edit Booking
            </Link>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-gray-100">
        <dl className="divide-y divide-gray-100">
          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Status</dt>
            <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(booking.status)}`}>
                {booking.status}
              </span>
            </dd>
          </div>

          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Customer Information</dt>
            <dd className="mt-2 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              <div className="space-y-2">
                <p>Name: {booking.customer_name}</p>
                <p>Email: {booking.customer_email}</p>
                <p>Phone: {booking.customer_phone}</p>
              </div>
            </dd>
          </div>

          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Vehicle Information</dt>
            <dd className="mt-2 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              <div className="space-y-2">
                <p>Model: {booking.vehicle_model}</p>
                <p>Type: {booking.vehicle_type}</p>
                <p>Number Plate: {booking.vehicle_number}</p>
              </div>
            </dd>
          </div>

          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Booking Period</dt>
            <dd className="mt-2 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              <div className="space-y-2">
                <p>Start Date: {formatDate(booking.start_date)}</p>
                <p>End Date: {formatDate(booking.end_date)}</p>
                {booking.return_date && (
                  <p>Return Date: {formatDate(booking.return_date)}</p>
                )}
              </div>
            </dd>
          </div>

          <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
            <dt className="text-sm font-medium leading-6 text-gray-900">Payment Information</dt>
            <dd className="mt-2 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
              <div className="space-y-2">
                <p>Total Amount: {formatCurrency(booking.total_amount)}</p>
                <p>Payment Status: {booking.payment_status}</p>
              </div>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
} 