import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../../config';

// Rental report endpoint
async function getRentalReports(request: AuthenticatedRequest) {
  // Admin or worker authorization required
  if (!request.user || (request.user.role !== 'admin' && request.user.role !== 'worker')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const db = await getDB();
    
    // Get report type
    const reportType = searchParams.get('type') || 'daily';
    
    // Get date range
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    // Validate dates if provided
    if (startDate && !isValidDate(startDate)) {
      return NextResponse.json({ error: 'Invalid start date format' }, { status: 400 });
    }
    
    if (endDate && !isValidDate(endDate)) {
      return NextResponse.json({ error: 'Invalid end date format' }, { status: 400 });
    }
    
    // Set default date range if not provided
    let dateFilter = '';
    const dateParams = [];
    
    if (startDate && endDate) {
      dateFilter = 'AND date(r.created_at) BETWEEN ? AND ?';
      dateParams.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'AND date(r.created_at) >= ?';
      dateParams.push(startDate);
    } else if (endDate) {
      dateFilter = 'AND date(r.created_at) <= ?';
      dateParams.push(endDate);
    }
    
    // Define time grouping based on report type
    let timeGrouping: string;
    switch (reportType) {
      case 'daily':
        timeGrouping = 'date(r.created_at)';
        break;
      case 'weekly':
        timeGrouping = "strftime('%Y-%W', r.created_at)";
        break;
      case 'monthly':
        timeGrouping = "strftime('%Y-%m', r.created_at)";
        break;
      case 'yearly':
        timeGrouping = "strftime('%Y', r.created_at)";
        break;
      case 'vehicle_type':
        timeGrouping = 'v.type';
        break;
      case 'worker':
        timeGrouping = 'u.id';
        break;
      default:
        timeGrouping = 'date(r.created_at)';
    }
    
    // Construct query based on report type
    let query = '';
    let additionalFields = '';
    
    if (reportType === 'worker') {
      additionalFields = ', u.full_name as worker_name';
    }
    
    query = `
      SELECT 
        ${timeGrouping} as period${additionalFields},
        COUNT(r.id) as total_rentals,
        COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_rentals,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_rentals,
        COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) as cancelled_rentals,
        COUNT(CASE WHEN r.status = 'overdue' THEN 1 END) as overdue_rentals,
        SUM(r.total_amount) as total_amount,
        SUM(CASE WHEN r.payment_status = 'paid' THEN r.total_amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN r.payment_status = 'partial' THEN r.total_amount ELSE 0 END) as partially_paid_amount,
        SUM(CASE WHEN r.payment_status = 'unpaid' THEN r.total_amount ELSE 0 END) as unpaid_amount,
        AVG(r.total_amount) as average_amount,
        COUNT(DISTINCT r.customer_id) as unique_customers,
        COUNT(DISTINCT r.vehicle_id) as unique_vehicles
      FROM rentals r
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN users u ON r.worker_id = u.id
      WHERE 1=1 ${dateFilter}
      GROUP BY period
      ORDER BY period
    `;
    
    // Execute the query
    const report = await db.all(query, dateParams);
    
    // Get detailed statistics
    const totalStats = await db.get(`
      SELECT 
        COUNT(r.id) as total_rentals,
        SUM(r.total_amount) as total_amount,
        COUNT(DISTINCT r.customer_id) as unique_customers,
        COUNT(DISTINCT r.vehicle_id) as unique_vehicles,
        COUNT(CASE WHEN r.status = 'active' THEN 1 END) as active_rentals,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_rentals,
        COUNT(CASE WHEN r.status = 'cancelled' THEN 1 END) as cancelled_rentals,
        COUNT(CASE WHEN r.status = 'overdue' THEN 1 END) as overdue_rentals,
        COUNT(CASE WHEN r.payment_status = 'paid' THEN 1 END) as fully_paid,
        COUNT(CASE WHEN r.payment_status = 'partial' THEN 1 END) as partially_paid,
        COUNT(CASE WHEN r.payment_status = 'unpaid' THEN 1 END) as unpaid,
        AVG(r.total_amount) as average_rental_value,
        AVG(JULIANDAY(r.end_date) - JULIANDAY(r.start_date)) as average_rental_duration
      FROM rentals r
      WHERE 1=1 ${dateFilter}
    `, dateParams);
    
    // Get top vehicles by rental count
    const topVehicles = await db.all(`
      SELECT 
        v.id,
        v.type,
        v.model,
        v.number_plate,
        COUNT(r.id) as rental_count,
        SUM(r.total_amount) as total_revenue
      FROM rentals r
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE 1=1 ${dateFilter}
      GROUP BY v.id
      ORDER BY rental_count DESC
      LIMIT 10
    `, dateParams);
    
    // Get top customers by rental count and amount
    const topCustomers = await db.all(`
      SELECT 
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        COUNT(r.id) as rental_count,
        SUM(r.total_amount) as total_spent
      FROM rentals r
      JOIN customers c ON r.customer_id = c.id
      WHERE 1=1 ${dateFilter}
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 10
    `, dateParams);
    
    // Get revenue by vehicle type
    const revenueByVehicleType = await db.all(`
      SELECT 
        v.type,
        COUNT(r.id) as rental_count,
        SUM(r.total_amount) as total_revenue,
        AVG(r.total_amount) as average_revenue
      FROM rentals r
      JOIN vehicles v ON r.vehicle_id = v.id
      WHERE 1=1 ${dateFilter}
      GROUP BY v.type
      ORDER BY total_revenue DESC
    `, dateParams);
    
    // Return the full report
    return NextResponse.json({
      report_type: reportType,
      date_range: {
        start_date: startDate || 'all past',
        end_date: endDate || 'present'
      },
      data: report,
      summary: totalStats,
      top_vehicles: topVehicles,
      top_customers: topCustomers,
      revenue_by_vehicle_type: revenueByVehicleType
    });
  } catch (error) {
    console.error('Error generating rental report:', error);
    return NextResponse.json(
      { error: 'Failed to generate rental report' },
      { status: 500 }
    );
  }
}

// Helper function to validate date format (YYYY-MM-DD)
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export const GET = withAuth(getRentalReports); 