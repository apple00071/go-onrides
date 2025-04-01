import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withRoleCheck } from '@/lib/auth';
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

    // Get total customers and identify new vs returning
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, created_at');

    if (customerError) {
      console.error('Error fetching customers:', customerError);
      throw customerError;
    }

    const newCustomers = customers?.filter(c => 
      new Date(c.created_at) >= new Date(startDate) && 
      new Date(c.created_at) <= new Date(endDate)
    ).length || 0;

    // Get bookings data
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

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
        .select('id, first_name, last_name')
        .in('id', customerIds);
        
      if (customerDetails?.length) {
        customersData = customerDetails.reduce((acc: Record<string | number, any>, customer) => {
          acc[customer.id] = customer;
          return acc;
        }, {});
      }
    }

    // Get payments for the bookings
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, booking_id')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      throw paymentsError;
    }

    // Calculate statistics
    const totalBookings = bookings?.length || 0;
    const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    const activeBookings = bookings?.filter(b => b.status === 'active').length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;

    // Calculate revenue by vehicle type
    const byVehicleType = bookings?.reduce((acc: any[], booking) => {
      const vehicle = vehiclesData[booking.vehicle_id];
      const type = vehicle?.type || 'unknown';
      const payment = payments?.find(p => p.booking_id === booking.id);
      const revenue = payment?.amount || 0;
      
      const existing = acc.find(item => item.type === type);
      if (existing) {
        existing.revenue += revenue;
        existing.count += 1;
      } else {
        acc.push({ type, revenue, count: 1 });
      }
      return acc;
    }, []) || [];

    // Calculate booking duration distribution
    const bookingDuration = bookings?.reduce((acc: any[], booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      
      let duration;
      if (days <= 1) duration = '1 day';
      else if (days <= 3) duration = '2-3 days';
      else if (days <= 7) duration = '4-7 days';
      else duration = '7+ days';

      const existing = acc.find(item => item.duration === duration);
      if (existing) {
        existing.count += 1;
      } else {
        acc.push({ duration, count: 1 });
      }
      return acc;
    }, []) || [];

    // Calculate customer segments
    const customerSegments = [
      { segment: 'New Customers', count: newCustomers },
      { segment: 'Returning Customers', count: (customers?.length || 0) - newCustomers }
    ];

    return NextResponse.json({
      success: true,
      data: {
        totalCustomers: customers?.length || 0,
        newCustomers,
        returningCustomers: (customers?.length || 0) - newCustomers,
        totalBookings,
        totalRevenue,
        activeBookings,
        completedBookings,
        byVehicleType,
        bookingDuration,
        customerSegments
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

// Role check middleware to protect the route
export const GET = withRoleCheck(handler, ['admin']); 