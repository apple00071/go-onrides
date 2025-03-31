'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/format';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
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
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerDetails();
  }, [params.id]);

  const fetchCustomerDetails = async () => {
    try {
      const response = await fetch(`/api/customers/${params.id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch customer details');
      }

      const data = await response.json();
      if (data.success) {
        setCustomer(data.customer);
      } else {
        throw new Error(data.error || 'Failed to fetch customer details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!customer) return <ErrorAlert message="Customer not found" />;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Customer Details</h1>
          <p className="mt-2 text-sm text-gray-700">
            Detailed information about the customer.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href={`/worker/customers/${customer.id}/edit`}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:w-auto"
          >
            Edit Customer
          </Link>
        </div>
      </div>

      <div className="mt-8 overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.first_name} {customer.last_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.email || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.phone}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
                <dl className="mt-4 space-y-4">
                  <div>
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

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Emergency Contacts</h3>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Father's Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.father_phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Mother's Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.mother_phone || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Emergency Contact 1</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.emergency_contact1 || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Emergency Contact 2</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.emergency_contact2 || '-'}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900">Identification</h3>
                <dl className="mt-4 space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Aadhar Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.aadhar_number || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Driver's License</dt>
                    <dd className="mt-1 text-sm text-gray-900">{customer.dl_number || '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Documents Section - Conditionally rendered */}
            {(customer.photo_url || customer.dl_front_url || customer.dl_back_url || customer.aadhar_front_url || customer.aadhar_back_url) && (
              <div className="sm:col-span-2">
                <h3 className="text-lg font-medium text-gray-900">Documents</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {customer.photo_url && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Photo</dt>
                      <dd className="mt-1">
                        <img 
                        src={customer.photo_url} 
                        alt="Customer" 
                        className="h-32 w-32 object-cover rounded-lg" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }}
                      />
                      </dd>
                    </div>
                  )}
                  {customer.dl_front_url && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">DL Front</dt>
                      <dd className="mt-1">
                        <img 
                        src={customer.dl_front_url} 
                        alt="DL Front" 
                        className="h-32 w-32 object-cover rounded-lg" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }}
                      />
                      </dd>
                    </div>
                  )}
                  {customer.dl_back_url && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">DL Back</dt>
                      <dd className="mt-1">
                        <img 
                        src={customer.dl_back_url} 
                        alt="DL Back" 
                        className="h-32 w-32 object-cover rounded-lg" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }}
                      />
                      </dd>
                    </div>
                  )}
                  {customer.aadhar_front_url && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Aadhar Front</dt>
                      <dd className="mt-1">
                        <img 
                        src={customer.aadhar_front_url} 
                        alt="Aadhar Front" 
                        className="h-32 w-32 object-cover rounded-lg" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }}
                      />
                      </dd>
                    </div>
                  )}
                  {customer.aadhar_back_url && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Aadhar Back</dt>
                      <dd className="mt-1">
                        <img 
                        src={customer.aadhar_back_url} 
                        alt="Aadhar Back" 
                        className="h-32 w-32 object-cover rounded-lg" 
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }}
                      />
                      </dd>
                    </div>
                  )}
                </div>
              </div>
            )}

            {customer.notes && (
              <div className="sm:col-span-2">
                <h3 className="text-lg font-medium text-gray-900">Notes</h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <h3 className="text-lg font-medium text-gray-900">Account Information</h3>
              <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>
      </div>
    </div>
  );
}