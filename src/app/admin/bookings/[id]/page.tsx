'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDate, getStatusColor } from '@/lib/utils';
import ErrorAlert from '@/components/ui/ErrorAlert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';

interface Booking {
  id: string;
  booking_id: string;
  customer_id: string;
  vehicle_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  vehicle_model: string;
  vehicle_type: string;
  vehicle_number: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  payment_status: string;
  documents?: {
    dl_front?: string;
    dl_back?: string;
    [key: string]: string | undefined;
  } | null;
  signature?: string | null;
  notes?: string | null;
  father_phone?: string;
  mother_phone?: string;
  emergency_contact1?: string;
  emergency_contact2?: string;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.booking) {
        throw new Error(data.error || 'Failed to load booking data');
      }
      
      setBooking(data.booking);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleEditClick = () => {
    router.push(`/admin/bookings/${params.id}/edit`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!booking) {
    return <ErrorAlert message="Booking not found" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Booking Details
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Booking ID: {booking.booking_id}
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Back
          </button>
          <button
            onClick={handleEditClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {booking.customer_name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {booking.vehicle_model} ({booking.vehicle_number})
            </p>
          </div>
          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </span>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Customer Contact</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div>{booking.customer_phone}</div>
                <div>{booking.customer_email}</div>
              </dd>
            </div>
            
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Emergency Contacts</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {booking.father_phone && (
                    <div>
                      <span className="text-gray-500 mr-2">Father:</span> {booking.father_phone}
                    </div>
                  )}
                  {booking.mother_phone && (
                    <div>
                      <span className="text-gray-500 mr-2">Mother:</span> {booking.mother_phone}
                    </div>
                  )}
                  {booking.emergency_contact1 && (
                    <div>
                      <span className="text-gray-500 mr-2">Emergency 1:</span> {booking.emergency_contact1}
                    </div>
                  )}
                  {booking.emergency_contact2 && (
                    <div>
                      <span className="text-gray-500 mr-2">Emergency 2:</span> {booking.emergency_contact2}
                    </div>
                  )}
                  {!booking.father_phone && !booking.mother_phone && !booking.emergency_contact1 && !booking.emergency_contact2 && (
                    <div className="text-gray-400 italic">No emergency contacts provided</div>
                  )}
                </div>
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Vehicle</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div>{booking.vehicle_model} ({booking.vehicle_type})</div>
                <div className="text-gray-500">Reg: {booking.vehicle_number}</div>
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Booking Period</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div>From: {formatDate(booking.start_date)}</div>
                <div>To: {formatDate(booking.end_date)}</div>
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Payment Information</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                <div>Amount: {formatCurrency(booking.total_amount)}</div>
                <div>
                  Payment Status: 
                  <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    booking.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.payment_status?.charAt(0).toUpperCase() + booking.payment_status?.slice(1) || 'Pending'}
                  </span>
                </div>
              </dd>
            </div>
            {booking.notes && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {booking.notes}
                </dd>
              </div>
            )}
            
            {booking.documents && Object.keys(booking.documents).length > 0 ? (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Documents</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(booking.documents || {}).map(([key, value]) => (
                      value && typeof value === 'string' && value.length > 0 ? (
                        <div key={key} className="border rounded-md p-3 bg-gray-50">
                          <div className="text-sm font-medium text-gray-700 mb-2 capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                          {value.startsWith('data:image') ? (
                            <div className="relative">
                              <img 
                                src={value} 
                                alt={key.replace(/_/g, ' ')} 
                                className="w-full h-auto max-h-48 object-contain rounded border bg-white p-2" 
                              />
                              <div className="absolute top-2 right-2">
                                <a 
                                  href={value} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="bg-white p-1 rounded-md shadow-sm hover:bg-gray-100"
                                  title="View full image"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-600">
                                    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                                    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs p-2 bg-white rounded border">{value}</div>
                          )}
                        </div>
                      ) : null
                    ))}
                  </div>
                </dd>
              </div>
            ) : (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Documents</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    No documents uploaded
                  </div>
                </dd>
              </div>
            )}
            
            {booking.signature && typeof booking.signature === 'string' && booking.signature.length > 0 ? (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Signature</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="border rounded-md p-3 bg-gray-50 max-w-xs">
                    <div className="text-sm font-medium text-gray-700 mb-2">Customer Signature</div>
                    {booking.signature.startsWith('data:image') ? (
                      <div className="relative">
                        <img 
                          src={booking.signature} 
                          alt="Customer Signature" 
                          className="max-h-24 object-contain bg-white p-2 border rounded" 
                        />
                        <div className="absolute top-2 right-2">
                          <a 
                            href={booking.signature} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="bg-white p-1 rounded-md shadow-sm hover:bg-gray-100"
                            title="View full signature"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-600">
                              <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                              <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs p-2 bg-white rounded border">{booking.signature}</div>
                    )}
                  </div>
                </dd>
              </div>
            ) : (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Signature</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="bg-gray-50 p-4 rounded-md text-gray-500 text-sm flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    No signature provided
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
} 