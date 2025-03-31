import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { withRoleCheck } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

async function handler(req: AuthenticatedRequest) {
  try {
    // Get period from query parameters
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'week';
    
    let dateFilter = '';
    
    // Create date filter based on period
    const now = new Date();
    switch (period) {
      case 'day':
        dateFilter = `created_at >= NOW() - INTERVAL '1 day'`;
        break;
      case 'week':
        dateFilter = `created_at >= NOW() - INTERVAL '7 days'`;
        break;
      case 'month':
        dateFilter = `created_at >= NOW() - INTERVAL '30 days'`;
        break;
      default:
        dateFilter = '';
    }

    // Get total rentals and revenue stats
    const { data: rentalStats, error: rentalError } = await supabase
      .from('bookings')
      .select('status, total_amount')
      .eq('status', 'active');

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
      pendingPayments: 0, // We'll implement this later with proper payment status tracking
      availableVehicles: vehicleStats?.filter(v => v.status === 'available').length || 0,
      maintenanceVehicles: vehicleStats?.filter(v => v.status === 'maintenance').length || 0,
      totalCustomers: customerCount || 0,
      overdueBookings: 0 // We'll implement this later with proper date comparison
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch dashboard statistics',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Role check middleware to protect the route
export const GET = withRoleCheck(handler, ['admin', 'worker']); 