import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../../config';

// Define interfaces for the database results
interface RentalRecord {
  id: string;
  type: string;
  customerName: string;
  vehicleModel: string;
  start_date: string;
  end_date: string;
  status: string;
  amount: number;
  payment_status: string;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  type: string;
  customerName: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

interface MaintenanceRecord {
  id: string;
  type: string;
  vehicleModel: string;
  vehicleNumberPlate: string;
  service_type: string;
  notes: string;
  service_date: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: 'rental' | 'payment' | 'maintenance' | 'customer' | 'vehicle';
  title: string;
  description: string;
  date: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  link?: {
    href: string;
    text: string;
  };
}

interface DashboardStats {
  totalRentals: number;
  activeRentals: number;
  totalRevenue: number;
  pendingPayments: number;
  availableVehicles: number;
  maintenanceVehicles: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  rentalsTrend: number;
  revenueTrend: number;
  customersTrend: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
}

async function handler(request: AuthenticatedRequest) {
  try {
    // Get total rentals and revenue stats
    const { data: rentalStats, error: rentalError } = await supabase
      .from('rentals')
      .select('status, total_amount, payment_status');

    if (rentalError) throw rentalError;

    // Get vehicle stats
    const { data: vehicleStats, error: vehicleError } = await supabase
      .from('vehicles')
      .select('status');

    if (vehicleError) throw vehicleError;

    // Get customer count
    const { count: customerCount, error: customerError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (customerError) throw customerError;

    // Calculate stats
    const stats = {
      totalBookings: rentalStats?.length || 0,
      activeBookings: rentalStats?.filter(r => r.status === 'active').length || 0,
      totalRevenue: rentalStats?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0,
      pendingPayments: rentalStats?.filter(r => r.payment_status === 'pending')
        .reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0,
      availableVehicles: vehicleStats?.filter(v => v.status === 'available').length || 0,
      maintenanceVehicles: vehicleStats?.filter(v => v.status === 'maintenance').length || 0,
      totalCustomers: customerCount || 0,
      overdueBookings: rentalStats?.filter(r => r.status === 'overdue').length || 0
    };

    return NextResponse.json({
      success: true,
      data: stats
        });
      } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

export const GET = handler;

// Default empty response 
const emptyResponse: DashboardData = {
  stats: {
    totalRentals: 0,
    activeRentals: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    rentalsTrend: 0,
    revenueTrend: 0,
    customersTrend: 0
  },
  recentActivity: []
}; 