import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Payment report endpoint
async function getPaymentReports(request: AuthenticatedRequest) {
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
      dateFilter = 'AND date(p.created_at) BETWEEN ? AND ?';
      dateParams.push(startDate, endDate);
    } else if (startDate) {
      dateFilter = 'AND date(p.created_at) >= ?';
      dateParams.push(startDate);
    } else if (endDate) {
      dateFilter = 'AND date(p.created_at) <= ?';
      dateParams.push(endDate);
    }
    
    // Additional filters
    if (searchParams.has('method')) {
      dateFilter += ' AND p.method = ?';
      dateParams.push(searchParams.get('method'));
    }
    
    if (searchParams.has('status')) {
      dateFilter += ' AND p.status = ?';
      dateParams.push(searchParams.get('status'));
    }
    
    // Define time grouping based on report type
    let timeGrouping: string;
    let additionalFields = '';
    
    switch (reportType) {
      case 'daily':
        timeGrouping = 'date(p.created_at)';
        break;
      case 'weekly':
        timeGrouping = "strftime('%Y-%W', p.created_at)";
        break;
      case 'monthly':
        timeGrouping = "strftime('%Y-%m', p.created_at)";
        break;
      case 'yearly':
        timeGrouping = "strftime('%Y', p.created_at)";
        break;
      case 'payment_method':
        timeGrouping = 'p.method';
        break;
      case 'worker':
        timeGrouping = 'p.received_by';
        additionalFields = ', u.full_name as worker_name';
        break;
      default:
        timeGrouping = 'date(p.created_at)';
    }
    
    // Main query for payment report data
    const query = `
      SELECT 
        ${timeGrouping} as period${additionalFields},
        COUNT(p.id) as total_payments,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_amount,
        COUNT(CASE WHEN p.method = 'cash' THEN 1 END) as cash_payments,
        COUNT(CASE WHEN p.method = 'card' THEN 1 END) as card_payments,
        COUNT(CASE WHEN p.method = 'upi' THEN 1 END) as upi_payments,
        COUNT(CASE WHEN p.method = 'other' THEN 1 END) as other_payments,
        SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END) as cash_amount,
        SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END) as card_amount,
        SUM(CASE WHEN p.method = 'upi' THEN p.amount ELSE 0 END) as upi_amount,
        SUM(CASE WHEN p.method = 'other' THEN p.amount ELSE 0 END) as other_amount,
        COUNT(DISTINCT r.id) as unique_rentals,
        COUNT(DISTINCT r.customer_id) as unique_customers
      FROM payments p
      LEFT JOIN rentals r ON p.rental_id = r.id
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.status = 'completed' ${dateFilter}
      GROUP BY period
      ORDER BY period
    `;
    
    // Execute the main query
    const report = await db.all(query, dateParams);
    
    // Get overall summary statistics
    const overallStats = await db.get(`
      SELECT 
        COUNT(p.id) as total_payments,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_amount,
        MIN(p.amount) as min_amount,
        MAX(p.amount) as max_amount,
        COUNT(DISTINCT r.id) as unique_rentals,
        COUNT(DISTINCT r.customer_id) as unique_customers,
        COUNT(CASE WHEN p.method = 'cash' THEN 1 END) as cash_payments,
        COUNT(CASE WHEN p.method = 'card' THEN 1 END) as card_payments,
        COUNT(CASE WHEN p.method = 'upi' THEN 1 END) as upi_payments,
        COUNT(CASE WHEN p.method = 'other' THEN 1 END) as other_payments,
        SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END) as cash_amount,
        SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END) as card_amount,
        SUM(CASE WHEN p.method = 'upi' THEN p.amount ELSE 0 END) as upi_amount,
        SUM(CASE WHEN p.method = 'other' THEN p.amount ELSE 0 END) as other_amount
      FROM payments p
      LEFT JOIN rentals r ON p.rental_id = r.id
      WHERE p.status = 'completed' ${dateFilter}
    `, dateParams);
    
    // Get payment distribution by worker
    const paymentsByWorker = await db.all(`
      SELECT 
        u.id as worker_id,
        u.full_name as worker_name,
        COUNT(p.id) as payment_count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_amount,
        COUNT(CASE WHEN p.method = 'cash' THEN 1 END) as cash_payments,
        COUNT(CASE WHEN p.method = 'card' THEN 1 END) as card_payments,
        SUM(CASE WHEN p.method = 'cash' THEN p.amount ELSE 0 END) as cash_amount,
        SUM(CASE WHEN p.method = 'card' THEN p.amount ELSE 0 END) as card_amount
      FROM payments p
      JOIN users u ON p.received_by = u.id
      WHERE p.status = 'completed' ${dateFilter}
      GROUP BY u.id
      ORDER BY total_amount DESC
    `, dateParams);
    
    // Get daily trend for selected period
    const dailyTrend = await db.all(`
      SELECT 
        date(p.created_at) as date,
        COUNT(p.id) as payment_count,
        SUM(p.amount) as total_amount
      FROM payments p
      WHERE p.status = 'completed' ${dateFilter}
      GROUP BY date(p.created_at)
      ORDER BY date(p.created_at)
      LIMIT 30
    `, dateParams);
    
    // Return the complete report
    return NextResponse.json({
      report_type: reportType,
      date_range: {
        start_date: startDate || 'all past',
        end_date: endDate || 'present'
      },
      data: report,
      summary: overallStats,
      payments_by_worker: paymentsByWorker,
      daily_trend: dailyTrend
    });
  } catch (error) {
    console.error('Error generating payment report:', error);
    return NextResponse.json(
      { error: 'Failed to generate payment report' },
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

export const GET = withAuth(getPaymentReports); 