import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../../config';
import { withRoleCheck } from '@/lib/auth';

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
  totalCustomers: number;
  totalVehicles: number;
  totalUsers: number;
  totalBookings: number;
  activeBookings: number;
  totalRevenue: number;
  pendingPayments: number;
  overdueBookings: number;
  recentBookings: {
    id: string;
    booking_id: string;
    customer_name: string;
    vehicle: string;
    start_date: string;
    end_date: string;
    status: string;
    amount: number;
    payment_status: string;
  }[];
  bookingsTrend: number;
  customersTrend: number;
  revenueTrend: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
}

async function handler(request: AuthenticatedRequest) {
  try {
    // Get total customers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('*');

    if (customerError) {
      throw customerError;
    }

    // Get total vehicles
    const { data: vehicles, error: vehicleError } = await supabase
      .from('vehicles')
      .select('*');

    if (vehicleError) {
      throw vehicleError;
    }

    // Get total users
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*');

    if (userError) {
      throw userError;
    }

    // Get total bookings and revenue stats
    const { data: bookingStats, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(first_name, last_name),
        vehicle:vehicles(model, number_plate)
      `)
      .order('created_at', { ascending: false });

    if (bookingError) {
      throw bookingError;
    }

    // Get recent bookings
    const recentBookings = (bookingStats || [])
      .slice(0, 5)
      .map(booking => ({
        id: booking.id,
        booking_id: booking.booking_id,
        customer_name: `${booking.customer.first_name} ${booking.customer.last_name}`,
        vehicle: `${booking.vehicle.model} (${booking.vehicle.number_plate})`,
        start_date: booking.start_date,
        end_date: booking.end_date,
        status: booking.status,
        amount: booking.total_amount,
        payment_status: booking.payment_status
      }));

    const stats: DashboardStats = {
      totalCustomers: customers?.length || 0,
      totalVehicles: vehicles?.length || 0,
      totalUsers: users?.length || 0,
      totalBookings: bookingStats?.length || 0,
      activeBookings: bookingStats?.filter(r => r.status === 'active').length || 0,
      totalRevenue: bookingStats?.reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0,
      pendingPayments: bookingStats?.filter(r => r.payment_status === 'pending')
        .reduce((sum, r) => sum + (r.total_amount || 0), 0) || 0,
      overdueBookings: bookingStats?.filter(r => r.status === 'overdue').length || 0,
      recentBookings,
      bookingsTrend: 0, // TODO: Implement trend calculation
      customersTrend: 0, // TODO: Implement trend calculation
      revenueTrend: 0 // TODO: Implement trend calculation
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}

// Role check middleware to protect the route
export const GET = withRoleCheck(handler, ['admin']);

// Default empty response 
const emptyResponse: DashboardData = {
  stats: {
    totalCustomers: 0,
    totalVehicles: 0,
    totalUsers: 0,
    totalBookings: 0,
    activeBookings: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    overdueBookings: 0,
    recentBookings: [],
    bookingsTrend: 0,
    customersTrend: 0,
    revenueTrend: 0
  },
  recentActivity: []
}; 