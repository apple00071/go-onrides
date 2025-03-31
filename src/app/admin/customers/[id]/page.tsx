'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, notFound } from 'next/navigation';
import Image from 'next/image';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { formatDate } from '@/lib/format';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchCustomerDetails } from '@/lib/api';
import { getInitials, formatCurrency } from '@/lib/utils';

interface CustomerDetailsProps {
  params: {
    id: string;
  };
}

interface CustomerDetails {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  created_at: string;
  status: string;
  bookings: {
    id: string;
    booking_id: string;
    vehicle: string;
    start_date: string;
    end_date: string;
    status: string;
    amount: number;
    payment_status: string;
  }[];
  stats: {
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    totalSpent: number;
  };
}

export default async function CustomerDetailsPage({ params }: CustomerDetailsProps) {
  const { data: customer, error } = await fetchCustomerDetails(params.id);

  if (error || !customer) {
    notFound();
  }

  const customerDetails: CustomerDetails = customer;

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'default';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Customer Details</h1>
        <div className="space-x-4">
          <Link href={`/admin/customers/${params.id}/edit`}>
            <Button>Edit Customer</Button>
          </Link>
          <Button variant="destructive">Delete Customer</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Profile Card */}
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${customerDetails.first_name}%20${customerDetails.last_name}`} />
              <AvatarFallback>{getInitials(`${customerDetails.first_name} ${customerDetails.last_name}`)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{`${customerDetails.first_name} ${customerDetails.last_name}`}</h2>
              <p className="text-sm text-gray-500">{customerDetails.email}</p>
              <Badge variant={customerDetails.status === 'active' ? 'success' : 'destructive'} className="mt-2">
                {customerDetails.status}
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{customerDetails.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Address</p>
              <p className="font-medium">{customerDetails.address}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">City</p>
              <p className="font-medium">{customerDetails.city}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">State</p>
              <p className="font-medium">{customerDetails.state}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Postal Code</p>
              <p className="font-medium">{customerDetails.postal_code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium">{formatDate(customerDetails.created_at)}</p>
            </div>
          </div>
        </Card>

        {/* Customer Stats */}
        <Card className="p-6 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Customer Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-semibold">{customerDetails.stats.totalBookings}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Active Bookings</p>
              <p className="text-2xl font-semibold">{customerDetails.stats.activeBookings}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Completed Bookings</p>
              <p className="text-2xl font-semibold">{customerDetails.stats.completedBookings}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Cancelled Bookings</p>
              <p className="text-2xl font-semibold">{customerDetails.stats.cancelledBookings}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-semibold">{formatCurrency(customerDetails.stats.totalSpent)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Booking History */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Booking History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customerDetails.bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.booking_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.vehicle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(booking.start_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(booking.end_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getBookingStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {formatCurrency(booking.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
} 