import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Set runtime and dynamic options explicitly as string literals
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Vehicle {
  model: string;
  type: string;
}

interface Customer {
  first_name: string;
  last_name: string;
  email: string;
}

interface BookingRow {
  id: string;
  booking_id: string;
  vehicle_id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  vehicle: Vehicle | null;
  customer: Customer | null;
}

async function handler(request: AuthenticatedRequest) {
  const supabase = createClient();

  try {
    const { data, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_id,
        vehicle_id,
        customer_id,
        start_date,
        end_date,
        status,
        total_amount,
        vehicle:vehicles (
          model,
          type
        ),
        customer:customers (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (bookingsError) {
      throw bookingsError;
    }

    // Safe type assertion with validation
    const bookings = ((data || []) as unknown[]).map(row => {
      const booking = row as Record<string, any>;
      return {
        id: booking.id,
        booking_id: booking.booking_id,
        vehicle_id: booking.vehicle_id,
        customer_id: booking.customer_id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        status: booking.status,
        total_amount: booking.total_amount || 0,
        vehicle: booking.vehicle ? {
          model: booking.vehicle.model,
          type: booking.vehicle.type,
        } : null,
        customer: booking.customer ? {
          first_name: booking.customer.first_name,
          last_name: booking.customer.last_name,
          email: booking.customer.email,
        } : null,
      } as BookingRow;
    });

    // Calculate statistics
    const totalBookings = bookings.length;
    const activeBookings = bookings.filter(b => b.status === 'active').length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);

    // Group bookings by vehicle type
    const byVehicleType = bookings.reduce((acc: Record<string, { count: number; revenue: number }>, booking) => {
      const type = booking.vehicle?.type || 'Unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, revenue: 0 };
      }
      acc[type].count++;
      acc[type].revenue += booking.total_amount || 0;
      return acc;
    }, {});

    // Calculate booking durations
    const bookingDurations = bookings.map(booking => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });

    const durationRanges = {
      '1-3 days': bookingDurations.filter(d => d >= 1 && d <= 3).length,
      '4-7 days': bookingDurations.filter(d => d >= 4 && d <= 7).length,
      '8-14 days': bookingDurations.filter(d => d >= 8 && d <= 14).length,
      '15+ days': bookingDurations.filter(d => d >= 15).length,
    };

    return NextResponse.json({
      data: {
        totalBookings,
        activeBookings,
        completedBookings,
        totalRevenue,
        byVehicleType: Object.entries(byVehicleType).map(([type, stats]) => ({
          type,
          count: stats.count,
          revenue: stats.revenue,
        })),
        durationDistribution: Object.entries(durationRanges).map(([range, count]) => ({
          range,
          count,
        })),
        recentBookings: bookings.map(booking => ({
          id: booking.id,
          booking_id: booking.booking_id,
          vehicleName: booking.vehicle?.model,
          customerName: booking.customer
            ? `${booking.customer.first_name} ${booking.customer.last_name}`
            : 'Unknown',
          startDate: booking.start_date,
          endDate: booking.end_date,
          status: booking.status,
          amount: booking.total_amount,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching booking report:', error);
    return NextResponse.json(
      { error: 'Failed to generate booking report' },
      { status: 500 }
    );
  }
}

export { handler as GET }; 