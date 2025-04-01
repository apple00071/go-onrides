import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Set runtime and dynamic options explicitly as string literals
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function handler(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Get bookings within date range
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .gte('start_date', startDate)
      .lte('end_date', endDate);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    // Get vehicles and customers separately instead of using joins
    const vehicleIds = bookings?.map(b => b.vehicle_id).filter(Boolean) || [];
    const customerIds = bookings?.map(b => b.customer_id).filter(Boolean) || [];
    
    let vehiclesData: Record<string | number, any> = {};
    let customersData: Record<string | number, any> = {};
    
    // Get vehicles data
    if (vehicleIds.length > 0) {
      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('id, model, number_plate, type')
        .in('id', vehicleIds);
        
      if (vehicles?.length) {
        vehiclesData = vehicles.reduce((acc: Record<string | number, any>, vehicle) => {
          acc[vehicle.id] = vehicle;
          return acc;
        }, {});
      }
    }
    
    // Get customers data
    if (customerIds.length > 0) {
      const { data: customerDetails } = await supabase
        .from('customers')
        .select('id, first_name, last_name, email')
        .in('id', customerIds);
        
      if (customerDetails?.length) {
        customersData = customerDetails.reduce((acc: Record<string | number, any>, customer) => {
          acc[customer.id] = customer;
          return acc;
        }, {});
      }
    }

    // Format bookings with customer and vehicle details
    const formattedBookings = bookings?.map(booking => {
      const vehicle = vehiclesData[booking.vehicle_id] || {};
      const customer = customersData[booking.customer_id] || {};
      
      return {
        id: booking.id,
        booking_id: booking.booking_id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        status: booking.status,
        total_amount: booking.total_amount,
        customer_name: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'Unknown',
        customer_email: customer?.email || '',
        vehicle_model: vehicle?.model || 'Unknown',
        vehicle_number: vehicle?.number_plate || '',
        vehicle_type: vehicle?.type || ''
      };
    }) || [];

    // Calculate statistics
    const totalBookings = bookings?.length || 0;
    const activeBookings = bookings?.filter(b => b.status === 'active').length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
    const cancelledBookings = bookings?.filter(b => b.status === 'cancelled').length || 0;
    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0;

    // Calculate booking duration distribution
    const durationDistribution = bookings?.reduce((acc: {[key: string]: number}, booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      let duration;
      if (days <= 1) duration = '1 day';
      else if (days <= 3) duration = '2-3 days';
      else if (days <= 7) duration = '4-7 days';
      else duration = '7+ days';

      acc[duration] = (acc[duration] || 0) + 1;
      return acc;
    }, {}) || {};

    // Vehicle type statistics
    const vehicleTypeStats = bookings?.reduce((acc: {[key: string]: {count: number, revenue: number}}, booking) => {
      const vehicle = vehiclesData[booking.vehicle_id];
      const type = vehicle?.type || 'unknown';
      
      if (!acc[type]) {
        acc[type] = { count: 0, revenue: 0 };
      }
      
      acc[type].count += 1;
      acc[type].revenue += booking.total_amount || 0;
      
      return acc;
    }, {}) || {};

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalBookings,
          activeBookings,
          completedBookings,
          cancelledBookings,
          totalRevenue
        },
        durationDistribution,
        vehicleTypeStats,
        bookings: formattedBookings
      }
    });
  } catch (error) {
    console.error('Error generating bookings report:', error);
    return NextResponse.json(
      { error: 'Failed to generate bookings report' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler); 