'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/format';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import type { CustomerDetails } from '@/types';

interface CustomerDetailsProps {
  params: {
    id: string;
  };
}

export default function CustomerDetailsPage({ params }: CustomerDetailsProps) {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomerDetails = async () => {
      try {
        const response = await fetch(`/api/customers/${params.id}`, {
          credentials: 'include'
        });
        if (!response.ok) {
          throw new Error('Failed to fetch customer details');
        }
        const data = await response.json();
        setCustomer(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };

    fetchCustomerDetails();
  }, [params.id]);

  const getBookingStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!customer) return <div>No customer found</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {customer.first_name} {customer.last_name}
        </h1>
        <div className="space-x-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/customers/${params.id}/edit`)}
          >
            Edit Customer
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/admin/customers')}
          >
            Back to Customers
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd>{customer.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd>{customer.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd>
                  {customer.address}
                  <br />
                  {customer.city}, {customer.state} {customer.postal_code}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Member Since</dt>
                <dd>{formatDate(customer.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Bookings</dt>
                <dd>{customer.stats.totalBookings}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Active Bookings</dt>
                <dd>{customer.stats.activeBookings}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Completed Bookings</dt>
                <dd>{customer.stats.completedBookings}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Spent</dt>
                <dd>{formatCurrency(customer.stats.totalSpent)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Booking History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-2 text-left">Booking ID</th>
                  <th className="px-4 py-2 text-left">Vehicle</th>
                  <th className="px-4 py-2 text-left">Start Date</th>
                  <th className="px-4 py-2 text-left">End Date</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {customer.bookings.map((booking) => (
                  <tr key={booking.id} className="border-b">
                    <td className="px-4 py-2">{booking.booking_id}</td>
                    <td className="px-4 py-2">{booking.vehicle}</td>
                    <td className="px-4 py-2">{formatDate(booking.start_date)}</td>
                    <td className="px-4 py-2">{formatDate(booking.end_date)}</td>
                    <td className="px-4 py-2">
                      <Badge className={getBookingStatusColor(booking.status)}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {formatCurrency(booking.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 