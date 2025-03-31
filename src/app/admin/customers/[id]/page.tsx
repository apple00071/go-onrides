'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { formatDate } from '@/lib/format';
import Link from 'next/link';

interface CustomerDetailsProps {
  params: {
    id: string;
  };
}

interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  father_phone?: string;
  mother_phone?: string;
  emergency_contact1?: string;
  emergency_contact2?: string;
  dl_number?: string;
  aadhar_number?: string;
  photo_url?: string;
  dl_front_url?: string;
  dl_back_url?: string;
  aadhar_front_url?: string;
  aadhar_back_url?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  bookings: any[];
}

export default function CustomerDetailsPage({ params }: CustomerDetailsProps) {
  const { id } = params;
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const fetchCustomerDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/customers/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Customer not found');
        }
        throw new Error('Failed to fetch customer details');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch customer details');
      }
      setCustomer(data.customer);
    } catch (err) {
      console.error('Error fetching customer:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCustomerDetails();
  }, [id]);
  
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete customer');
      }
      
      router.push('/admin/customers');
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setShowDeleteConfirm(false);
    }
  };
  
  const handleEditClick = () => {
    router.push(`/admin/customers/${id}/edit`);
  };
  
  const formatPhoneNumber = (phone: string) => {
    return phone || 'N/A';
  };
  
  const getRentalStatusColor = (status: string) => {
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
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!customer) return <ErrorAlert message="Customer not found" />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Customer Information</h1>
          <p className="mt-2 text-sm text-gray-700">Personal details and contact information.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href={`/admin/customers/${customer.id}/edit`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Edit Customer
          </Link>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            {/* Personal Information */}
            <div className="sm:col-span-2">
              <div className="bg-gray-50 px-4 py-3 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
              </div>
              <div className="mt-4 px-4 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Full name</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {customer.first_name} {customer.last_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.email || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatPhoneNumber(customer.phone || '')}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Address Information */}
            <div className="sm:col-span-2">
              <div className="bg-gray-50 px-4 py-3 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
              </div>
              <div className="mt-4 px-4 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.address || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">City</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.city || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">State</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.state || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">PIN Code</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.pincode || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="sm:col-span-2">
              <div className="bg-gray-50 px-4 py-3 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Emergency Contacts</h3>
              </div>
              <div className="mt-4 px-4 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Father's phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatPhoneNumber(customer.father_phone || '')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Mother's phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatPhoneNumber(customer.mother_phone || '')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Emergency contact 1</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatPhoneNumber(customer.emergency_contact1 || '')}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Emergency contact 2</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatPhoneNumber(customer.emergency_contact2 || '')}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Identification */}
            <div className="sm:col-span-2">
              <div className="bg-gray-50 px-4 py-3 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Identification</h3>
              </div>
              <div className="mt-4 px-4 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Driver's License Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.dl_number || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Aadhar Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.aadhar_number || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Documents */}
            {(customer.photo_url || customer.dl_front_url || customer.dl_back_url || customer.aadhar_front_url || customer.aadhar_back_url) && (
              <div className="sm:col-span-2">
                <div className="bg-gray-50 px-4 py-3 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                </div>
                <div className="mt-4 px-4 sm:px-6">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {customer.photo_url && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Photo</dt>
                        <dd className="mt-1">
                          <img src={customer.photo_url} alt="Customer" className="h-32 w-32 object-cover rounded-lg" />
                        </dd>
                      </div>
                    )}
                    {customer.dl_front_url && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">DL Front</dt>
                        <dd className="mt-1">
                          <img src={customer.dl_front_url} alt="DL Front" className="h-32 w-32 object-cover rounded-lg" />
                        </dd>
                      </div>
                    )}
                    {customer.dl_back_url && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">DL Back</dt>
                        <dd className="mt-1">
                          <img src={customer.dl_back_url} alt="DL Back" className="h-32 w-32 object-cover rounded-lg" />
                        </dd>
                      </div>
                    )}
                    {customer.aadhar_front_url && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Aadhar Front</dt>
                        <dd className="mt-1">
                          <img src={customer.aadhar_front_url} alt="Aadhar Front" className="h-32 w-32 object-cover rounded-lg" />
                        </dd>
                      </div>
                    )}
                    {customer.aadhar_back_url && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Aadhar Back</dt>
                        <dd className="mt-1">
                          <img src={customer.aadhar_back_url} alt="Aadhar Back" className="h-32 w-32 object-cover rounded-lg" />
                        </dd>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="sm:col-span-2">
              <div className="bg-gray-50 px-4 py-3 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Notes</h3>
              </div>
              <div className="mt-4 px-4 sm:px-6">
                <p className="text-sm text-gray-900 whitespace-pre-wrap">
                  {customer.notes || 'No notes available'}
                </p>
              </div>
            </div>

            {/* Account Information */}
            <div className="sm:col-span-2">
              <div className="bg-gray-50 px-4 py-3 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
              </div>
              <div className="mt-4 px-4 sm:px-6">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created At</dt>
                    <dd className="mt-1 text-sm text-gray-900">{formatDate(customer.created_at)}</dd>
                  </div>
                  {customer.updated_at && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                      <dd className="mt-1 text-sm text-gray-900">{formatDate(customer.updated_at)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </dl>
        </div>
      </div>
      
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete customer</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this customer? All associated rentals and records will be permanently removed. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDelete}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 