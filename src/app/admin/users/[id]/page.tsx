'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, notFound } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { User, Permission } from '@/types';
import { fetchUserDetails } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import Link from 'next/link';

interface UserDetailsProps {
  params: {
    id: string;
  };
}

interface UserWithActivity extends User {
  last_login_at?: string;
  activity?: {
    totalActions: number;
    rentalsCreated: number;
    rentalsCompleted: number;
    paymentsProcessed: number;
    maintenanceRecords: number;
  };
}

interface UserStats {
  totalActions: number;
  bookingsCreated: number;
  bookingsCompleted: number;
  paymentsReceived: number;
  paymentsAmount: number;
  maintenanceRecords: number;
}

interface UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  created_at: string;
  last_login: string;
  status: string;
  stats: UserStats;
}

export default async function UserDetailsPage({ params }: UserDetailsProps) {
  const { data: user, error } = await fetchUserDetails(params.id);

  if (error || !user) {
    notFound();
  }

  const userDetails: UserDetails = user;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">User Details</h1>
        <Link href={`/admin/users/${params.id}/edit`}>
          <Button>Edit User</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Profile Card */}
        <Card className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userDetails.first_name}%20${userDetails.last_name}`} />
              <AvatarFallback>{getInitials(`${userDetails.first_name} ${userDetails.last_name}`)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{`${userDetails.first_name} ${userDetails.last_name}`}</h2>
              <p className="text-sm text-gray-500">{userDetails.email}</p>
              <Badge variant={userDetails.status === 'active' ? 'success' : 'destructive'} className="mt-2">
                {userDetails.status}
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <p className="font-medium">{userDetails.role}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{userDetails.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created At</p>
              <p className="font-medium">{new Date(userDetails.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Login</p>
              <p className="font-medium">{new Date(userDetails.last_login).toLocaleDateString()}</p>
            </div>
          </div>
        </Card>

        {/* Activity Stats */}
        <Card className="p-6 md:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Activity Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Actions</p>
              <p className="text-2xl font-semibold">{userDetails.stats.totalActions}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Bookings Created</p>
              <p className="text-2xl font-semibold">{userDetails.stats.bookingsCreated}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Bookings Completed</p>
              <p className="text-2xl font-semibold">{userDetails.stats.bookingsCompleted}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Payments Received</p>
              <p className="text-2xl font-semibold">{userDetails.stats.paymentsReceived}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Total Payments</p>
              <p className="text-2xl font-semibold">${userDetails.stats.paymentsAmount}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Maintenance Records</p>
              <p className="text-2xl font-semibold">{userDetails.stats.maintenanceRecords}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 