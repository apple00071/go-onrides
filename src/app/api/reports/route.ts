import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

async function getReports(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'last30days';
    
    const db = await getDB();
    let dateFilter = '';
    
    // Create date filter based on range
    const now = new Date();
    switch (range) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        dateFilter = `date(r.created_at) = '${today}'`;
        break;
      case 'last7days':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        dateFilter = `date(r.created_at) >= '${weekAgo}'`;
        break;
      case 'last30days':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        dateFilter = `date(r.created_at) >= '${monthAgo}'`;
        break;
      case 'thisMonth':
        dateFilter = `strftime('%Y-%m', r.created_at) = strftime('%Y-%m', 'now')`;
        break;
      case 'lastMonth':
        dateFilter = `strftime('%Y-%m', r.created_at) = strftime('%Y-%m', 'now', '-1 month')`;
        break;
      case 'thisYear':
        dateFilter = `strftime('%Y', r.created_at) = strftime('%Y', 'now')`;
        break;
      default:
        dateFilter = '';
    }

    // Get total bookings and their statuses
    const bookingsQuery = `
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_bookings,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings
      FROM rentals r
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
    `;
    const bookingsResult = await db.get(bookingsQuery);

    // Get vehicle utilization
    const vehicleUtilizationQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'rented' THEN 1 END) as rented,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance
      FROM vehicles
    `;
    const vehicleUtilization = await db.get(vehicleUtilizationQuery);

    // Get revenue by vehicle type
    const revenueByTypeQuery = `
      SELECT 
        v.type,
        SUM(r.total_amount) as revenue
      FROM rentals r
      JOIN vehicles v ON r.vehicle_id = v.id
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
      GROUP BY v.type
    `;
    const revenueByTypeResult = await db.all(revenueByTypeQuery);
    const revenueByVehicleType = revenueByTypeResult.reduce((acc: any, curr: any) => {
      acc[curr.type] = curr.revenue || 0;
      return acc;
    }, {});

    // Get monthly revenue
    const monthlyRevenueQuery = `
      SELECT 
        strftime('%Y-%m', r.created_at) as month,
        SUM(r.total_amount) as revenue
      FROM rentals r
      GROUP BY strftime('%Y-%m', r.created_at)
      ORDER BY month DESC
      LIMIT 12
    `;
    const monthlyRevenue = await db.all(monthlyRevenueQuery);

    // Calculate total revenue
    const totalRevenue = Object.values(revenueByVehicleType).reduce((a: any, b: any) => a + b, 0);

    const reportData = {
      totalRevenue,
      totalBookings: bookingsResult.total_bookings,
      activeBookings: bookingsResult.active_bookings,
      completedBookings: bookingsResult.completed_bookings,
      cancelledBookings: bookingsResult.cancelled_bookings,
      vehicleUtilization,
      revenueByVehicleType,
      monthlyRevenue: monthlyRevenue.map(r => ({
        month: r.month,
        revenue: r.revenue || 0
      }))
    };

    return NextResponse.json(reportData);
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getReports); 