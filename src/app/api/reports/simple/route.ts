import { NextResponse } from 'next/server';
import { withRoleCheck } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Set runtime and dynamic options explicitly as string literals
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// This is a simplified reports API that just returns mock data
async function handler(request: AuthenticatedRequest) {
  try {
    console.log('Simple Reports API called');
    
    // Mock data for testing
    const mockData = {
      totalCustomers: 125,
      newCustomers: 42,
      returningCustomers: 83,
      totalBookings: 230,
      totalRevenue: 456000,
      activeBookings: 45,
      completedBookings: 175,
      byVehicleType: [
        { type: 'Bike', revenue: 256000, count: 128 },
        { type: 'Scooter', revenue: 150000, count: 75 },
        { type: 'Motorcycle', revenue: 50000, count: 27 }
      ],
      bookingDuration: [
        { duration: '1 day', count: 85 },
        { duration: '2-3 days', count: 67 },
        { duration: '4-7 days', count: 48 },
        { duration: '7+ days', count: 30 }
      ],
      customerSegments: [
        { segment: 'New Customers', count: 42 },
        { segment: 'Returning Customers', count: 83 }
      ]
    };

    return NextResponse.json({
      success: true,
      data: mockData
    });
  } catch (error) {
    console.error('Error in simple reports API:', error);
    return NextResponse.json(
      { error: 'Failed to generate simple report' },
      { status: 500 }
    );
  }
}

// Role check middleware to protect the route - allowing both admin and worker roles
export const GET = withRoleCheck(handler, ['admin', 'worker']); 