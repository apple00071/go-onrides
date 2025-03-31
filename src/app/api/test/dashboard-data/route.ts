import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    console.log('Fetching dashboard data...');
    const db = await getDB();
    
    // Get real stats from database
    const stats = await db.get(`
      SELECT 
        COUNT(*) as totalRentals,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeRentals,
        SUM(amount) as totalRevenue,
        SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END) as pendingPayments,
        (SELECT COUNT(*) FROM vehicles WHERE status = 'available') as availableVehicles,
        (SELECT COUNT(*) FROM vehicles WHERE status = 'maintenance') as maintenanceVehicles,
        (SELECT COUNT(*) FROM customers) as totalCustomers,
        (SELECT COUNT(*) FROM customers WHERE DATE(created_at) >= DATE('now', '-30 days')) as newCustomersThisMonth
      FROM rentals
    `);
    
    // Get recent activity from database
    const recentActivity = await db.all(`
      SELECT 
        'rental' as type,
        rental_id as id,
        'New Rental' as title,
        (SELECT first_name || ' ' || last_name FROM customers WHERE id = r.customer_id) || 
        ' rented ' ||
        (SELECT model FROM vehicles WHERE id = r.vehicle_id) as description,
        created_at as date,
        CASE 
          WHEN status = 'active' THEN 'success'
          WHEN status = 'pending' THEN 'warning'
          ELSE 'info'
        END as status
      FROM rentals r
      WHERE created_at >= DATE('now', '-7 days')
      
      UNION ALL
      
      SELECT 
        'payment' as type,
        id,
        'Payment Received' as title,
        'Payment of ₹' || amount || ' received for rental #' || rental_id as description,
        created_at as date,
        CASE 
          WHEN status = 'completed' THEN 'success'
          WHEN status = 'pending' THEN 'warning'
          ELSE 'info'
        END as status
      FROM payments
      WHERE created_at >= DATE('now', '-7 days')
      
      UNION ALL
      
      SELECT 
        'maintenance' as type,
        id,
        'Vehicle Maintenance' as title,
        service_type || ' - ' || notes as description,
        service_date as date,
        'info' as status
      FROM maintenance
      WHERE service_date >= DATE('now', '-7 days')
      
      ORDER BY date DESC
      LIMIT 10
    `);
    
    // Add links to activity items
    const activityWithLinks = recentActivity.map(item => ({
      ...item,
      link: {
        href: `/admin/${item.type}s/${item.id}`,
        text: `View ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}`
      }
    }));
    
    return NextResponse.json({
      stats: {
        ...stats,
        rentalsTrend: 0, // Calculate trend if needed
        revenueTrend: 0, // Calculate trend if needed
        customersTrend: 0 // Calculate trend if needed
      },
      recentActivity: activityWithLinks
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch dashboard data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 