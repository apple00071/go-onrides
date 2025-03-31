import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withAuth } from '@/lib/auth';

export const runtime = 'nodejs';

interface Vehicle {
  name: string;
  type: string;
}

interface Customer {
  first_name: string;
  last_name: string;
  email: string;
}

interface RentalRow {
  id: string;
  vehicle_id: string;
  customer_id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  vehicles: Vehicle | null;
  customers: Customer | null;
}

async function handler() {
  const supabase = createClient();

  try {
    const { data, error: rentalsError } = await supabase
      .from('rentals')
      .select(`
        id,
        vehicle_id,
        customer_id,
        start_date,
        end_date,
        status,
        total_amount,
        vehicles (
          name,
          type
        ),
        customers (
          first_name,
          last_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (rentalsError) {
      throw rentalsError;
    }

    // Safe type assertion with validation
    const rentals = ((data || []) as unknown[]).map(row => {
      const rental = row as Record<string, any>;
      return {
        id: rental.id,
        vehicle_id: rental.vehicle_id,
        customer_id: rental.customer_id,
        start_date: rental.start_date,
        end_date: rental.end_date,
        status: rental.status,
        total_amount: rental.total_amount || 0,
        vehicles: rental.vehicles ? {
          name: rental.vehicles.name,
          type: rental.vehicles.type,
        } : null,
        customers: rental.customers ? {
          first_name: rental.customers.first_name,
          last_name: rental.customers.last_name,
          email: rental.customers.email,
        } : null,
      } as RentalRow;
    });

    // Calculate statistics
    const totalRentals = rentals.length;
    const activeRentals = rentals.filter(r => r.status === 'active').length;
    const completedRentals = rentals.filter(r => r.status === 'completed').length;
    const totalRevenue = rentals.reduce((sum, r) => sum + (r.total_amount || 0), 0);

    // Group rentals by vehicle type
    const byVehicleType = rentals.reduce((acc: Record<string, { count: number; revenue: number }>, rental) => {
      const type = rental.vehicles?.type || 'Unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, revenue: 0 };
      }
      acc[type].count++;
      acc[type].revenue += rental.total_amount || 0;
      return acc;
    }, {});

    // Calculate rental durations
    const rentalDurations = rentals.map(rental => {
      const start = new Date(rental.start_date);
      const end = new Date(rental.end_date);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });

    const durationRanges = {
      '1-3 days': rentalDurations.filter(d => d >= 1 && d <= 3).length,
      '4-7 days': rentalDurations.filter(d => d >= 4 && d <= 7).length,
      '8-14 days': rentalDurations.filter(d => d >= 8 && d <= 14).length,
      '15+ days': rentalDurations.filter(d => d >= 15).length,
    };

    return NextResponse.json({
      data: {
        totalRentals,
        activeRentals,
        completedRentals,
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
        recentRentals: rentals.map(rental => ({
          id: rental.id,
          vehicleName: rental.vehicles?.name,
          customerName: rental.customers
            ? `${rental.customers.first_name} ${rental.customers.last_name}`
            : 'Unknown',
          startDate: rental.start_date,
          endDate: rental.end_date,
          status: rental.status,
          amount: rental.total_amount,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching rental report:', error);
    return NextResponse.json(
      { error: 'Failed to generate rental report' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler); 