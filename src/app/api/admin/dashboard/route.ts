import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { cookies } from 'next/headers';
import * as jose from 'jose';
import { AuthenticatedRequest } from '@/types';

// Define interfaces for the database results
interface RentalRecord {
  id: string;
  type: string;
  customerName: string;
  vehicleModel: string;
  start_date: string;
  end_date: string;
  status: string;
  amount: number;
  payment_status: string;
  created_at: string;
}

interface PaymentRecord {
  id: string;
  type: string;
  customerName: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

interface MaintenanceRecord {
  id: string;
  type: string;
  vehicleModel: string;
  vehicleNumberPlate: string;
  service_type: string;
  notes: string;
  service_date: string;
  created_at: string;
}

interface ActivityItem {
  id: string;
  type: 'rental' | 'payment' | 'maintenance' | 'customer' | 'vehicle';
  title: string;
  description: string;
  date: string;
  status?: 'success' | 'warning' | 'error' | 'info';
  link?: {
    href: string;
    text: string;
  };
}

interface DashboardStats {
  totalRentals: number;
  activeRentals: number;
  totalRevenue: number;
  pendingPayments: number;
  availableVehicles: number;
  maintenanceVehicles: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  rentalsTrend: number;
  revenueTrend: number;
  customersTrend: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
}

// Modified getDashboard function to handle authentication directly
export async function GET(request: Request) {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  const url = new URL(request.url);
  let user = null;
  let db = null;
  
  try {
    // Check for both token types
    const cookieStore = cookies();
    const authToken = cookieStore.get('authToken')?.value;
    const adminToken = cookieStore.get('adminToken')?.value;
    const token = authToken || adminToken;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing authentication token' },
        { status: 401 }
      );
    }
    
    try {
      // Verify the token
      const jwtSecret = new TextEncoder().encode(JWT_SECRET);
      let payload;
      
      if (token === authToken) {
        // Regular auth token format
        const verifiedToken = await jose.jwtVerify(token, jwtSecret);
        payload = verifiedToken.payload;
      } else {
        // Admin token format
        const decodedToken = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        payload = decodedToken;
      }
      
      // Check role
      if (payload.role !== 'admin' && payload.role !== 'worker') {
        return NextResponse.json(
          { error: 'Forbidden - Insufficient permissions' },
          { status: 403 }
        );
      }
      
      user = {
        id: payload.id,
        email: payload.email || payload.username,
        role: payload.role,
        full_name: payload.full_name || payload.username
      };
      
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    // Continue with the existing dashboard logic
    const searchParams = url.searchParams;
    const period = searchParams.get('period') || 'month';
    
    // Default empty response for cases when tables don't exist
    const emptyResponse: DashboardData = {
      stats: {
        totalRentals: 0,
        activeRentals: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        availableVehicles: 0,
        maintenanceVehicles: 0,
        totalCustomers: 0,
        newCustomersThisMonth: 0,
        rentalsTrend: 0,
        revenueTrend: 0,
        customersTrend: 0
      },
      recentActivity: []
    };
    
    // Continue with the existing dashboard data retrieval
    console.log('Initializing dashboard API...');
    db = await getDB();
    
    // Check what tables exist in the database
    const existingTables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table'
    `);
    console.log('Database tables found:', existingTables.map(t => t.name).join(', '));
    
    const tableExists = (tableName: string) => {
      return existingTables.some(t => t.name === tableName);
    };
    
    // If essential tables don't exist, return empty data
    if (!tableExists('rentals')) {
      console.log('Rentals table does not exist, returning empty data');
      return NextResponse.json(emptyResponse);
    }
    
    // Check rental table columns
    let amountColumn = 'amount';
    try {
      const columns = await db.all(`PRAGMA table_info(rentals)`);
      console.log('Rentals table columns:', columns.map(c => c.name).join(', '));
      
      const hasAmountColumn = columns.some(col => col.name === 'amount');
      if (!hasAmountColumn) {
        console.log('No "amount" column found, falling back to "total_amount"');
        amountColumn = 'total_amount';
      }
    } catch (err) {
      console.error('Error checking table columns:', err);
      amountColumn = 'total_amount'; // Default fallback
    }

    // Initialize dashboard data with defaults
    const dashboardData: DashboardData = {
      stats: {
        totalRentals: 0,
        activeRentals: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        availableVehicles: 0,
        maintenanceVehicles: 0,
        totalCustomers: 0,
        newCustomersThisMonth: 0,
        rentalsTrend: 0,
        revenueTrend: 0,
        customersTrend: 0
      },
      recentActivity: []
    };

    // Get rental statistics with dynamic column name
    try {
      console.log('Running rental stats query with amount column:', amountColumn);
      const rentalStats = await db.get(`
        SELECT 
          COUNT(*) as totalRentals,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeRentals,
          SUM(${amountColumn}) as totalRevenue,
          SUM(CASE WHEN payment_status = 'pending' THEN ${amountColumn} ELSE 0 END) as pendingPayments
        FROM rentals r
      `);
      
      if (rentalStats) {
        dashboardData.stats.totalRentals = rentalStats.totalRentals || 0;
        dashboardData.stats.activeRentals = rentalStats.activeRentals || 0;
        dashboardData.stats.totalRevenue = rentalStats.totalRevenue || 0;
        dashboardData.stats.pendingPayments = rentalStats.pendingPayments || 0;
      }
    } catch (error) {
      console.error('Error getting rental statistics:', error);
    }

    // Get vehicle counts if vehicles table exists
    if (tableExists('vehicles')) {
      try {
        console.log('Running vehicle counts query');
        const vehicleCounts = await db.get(`
          SELECT 
            COUNT(*) as totalVehicles,
            SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as availableVehicles,
            SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenanceVehicles
          FROM vehicles
        `);

        if (vehicleCounts) {
          dashboardData.stats.availableVehicles = vehicleCounts.availableVehicles || 0;
          dashboardData.stats.maintenanceVehicles = vehicleCounts.maintenanceVehicles || 0;
        }
      } catch (error) {
        console.error('Error getting vehicle statistics:', error);
      }
    }

    // Get customer statistics if customers table exists
    if (tableExists('customers')) {
      try {
        console.log('Running customer stats query');
        const customerStats = await db.get(`
          SELECT 
            COUNT(*) as totalCustomers,
            SUM(CASE WHEN strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now') THEN 1 ELSE 0 END) as newCustomersThisMonth
          FROM customers
        `);

        if (customerStats) {
          dashboardData.stats.totalCustomers = customerStats.totalCustomers || 0;
          dashboardData.stats.newCustomersThisMonth = customerStats.newCustomersThisMonth || 0;
        }
      } catch (error) {
        console.error('Error getting customer statistics:', error);
      }
    }

    // Get recent rentals if tables exist
    if (tableExists('rentals') && tableExists('customers') && tableExists('vehicles')) {
      try {
        console.log('Running recent rentals query');
        const recentRentals = await db.all(`
          SELECT 
            r.id,
            'rental' as type,
            c.first_name || ' ' || c.last_name as customerName,
            v.model as vehicleModel,
            r.start_date,
            r.end_date,
            r.status,
            r.${amountColumn} as amount,
            r.payment_status,
            r.created_at
          FROM rentals r
          LEFT JOIN customers c ON r.customer_id = c.id
          LEFT JOIN vehicles v ON r.vehicle_id = v.id
          ORDER BY r.created_at DESC
          LIMIT 10
        `);

        // Format rental activities
        recentRentals.forEach((rental: RentalRecord) => {
          try {
            const activity = {
              id: `rental-${rental.id}`,
              type: 'rental' as const,
              title: `Rental: ${rental.vehicleModel || 'Unknown vehicle'}`,
              description: `${rental.customerName || 'Unknown customer'} rented a ${rental.vehicleModel || 'vehicle'} from ${new Date(rental.start_date).toLocaleDateString()} to ${new Date(rental.end_date).toLocaleDateString()}`,
              date: rental.created_at ? new Date(rental.created_at).toLocaleString() : new Date().toLocaleString(),
              status: rental.status === 'active' ? 'success' as const : 
                     rental.status === 'pending' ? 'warning' as const : 
                     rental.status === 'completed' ? 'info' as const : 'error' as const,
              link: {
                href: `/admin/rentals/${rental.id}`,
                text: 'View Details'
              }
            };
            dashboardData.recentActivity.push(activity);
          } catch (err) {
            console.error('Error formatting rental activity:', err);
          }
        });
      } catch (error) {
        console.error('Error getting recent rentals:', error);
      }
    }

    // Get recent payments if tables exist
    if (tableExists('payments') && tableExists('rentals') && tableExists('customers')) {
      try {
        console.log('Running recent payments query');
        const recentPayments = await db.all(`
          SELECT 
            p.id,
            'payment' as type,
            c.first_name || ' ' || c.last_name as customerName,
            p.amount,
            p.method,
            p.status,
            p.created_at
          FROM payments p
          JOIN rentals r ON p.rental_id = r.id
          JOIN customers c ON r.customer_id = c.id
          ORDER BY p.created_at DESC
          LIMIT 10
        `);

        // Format payment activities
        recentPayments.forEach((payment: PaymentRecord) => {
          try {
            const activity = {
              id: `payment-${payment.id}`,
              type: 'payment' as const,
              title: `Payment Received: $${payment.amount?.toFixed(2) || '0.00'}`,
              description: `${payment.customerName || 'Unknown customer'} made a payment of $${payment.amount?.toFixed(2) || '0.00'} via ${payment.method || 'unknown method'}`,
              date: payment.created_at ? new Date(payment.created_at).toLocaleString() : new Date().toLocaleString(),
              status: payment.status === 'completed' ? 'success' as const : 
                     payment.status === 'pending' ? 'warning' as const : 'error' as const,
              link: {
                href: `/admin/payments/${payment.id}`,
                text: 'View Payment'
              }
            };
            dashboardData.recentActivity.push(activity);
          } catch (err) {
            console.error('Error formatting payment activity:', err);
          }
        });
      } catch (error) {
        console.error('Error getting recent payments:', error);
      }
    }

    // Get recent maintenance if tables exist
    if (tableExists('maintenance') && tableExists('vehicles')) {
      try {
        console.log('Running recent maintenance query');
        const recentMaintenance = await db.all(`
          SELECT 
            m.id,
            'maintenance' as type,
            v.model as vehicleModel,
            v.number_plate as vehicleNumberPlate,
            m.service_type,
            m.notes,
            m.service_date,
            m.created_at
          FROM maintenance m
          JOIN vehicles v ON m.vehicle_id = v.id
          ORDER BY m.created_at DESC
          LIMIT 5
        `);

        // Format maintenance activities
        recentMaintenance.forEach((maintenance: MaintenanceRecord) => {
          try {
            const activity = {
              id: `maintenance-${maintenance.id}`,
              type: 'maintenance' as const,
              title: `Vehicle Maintenance: ${maintenance.vehicleModel || 'Unknown vehicle'}`,
              description: `${maintenance.service_type || 'Maintenance'} performed on ${maintenance.vehicleModel || 'Unknown vehicle'} (${maintenance.vehicleNumberPlate || 'No plate'}) on ${maintenance.service_date ? new Date(maintenance.service_date).toLocaleDateString() : 'unknown date'}`,
              date: maintenance.created_at ? new Date(maintenance.created_at).toLocaleString() : new Date().toLocaleString(),
              status: 'info' as const,
              link: {
                href: `/admin/vehicles/${maintenance.id}/maintenance`,
                text: 'View Maintenance'
              }
            };
            dashboardData.recentActivity.push(activity);
          } catch (err) {
            console.error('Error formatting maintenance activity:', err);
          }
        });
      } catch (error) {
        console.error('Error getting recent maintenance:', error);
      }
    }

    // Sort the activities by date (newest first)
    dashboardData.recentActivity.sort((a: ActivityItem, b: ActivityItem) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Limit to 20 most recent activities
    dashboardData.recentActivity = dashboardData.recentActivity.slice(0, 20);

    console.log('Dashboard data ready to be returned');
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ 
      error: 'Error retrieving dashboard data',
      details: String(error)
    }, { status: 500 });
  } finally {
    // Properly close database connection
    if (db) {
      try {
        await db.close();
        console.log('Database connection closed');
      } catch (err) {
        console.error('Error closing database:', err);
      }
    }
  }
}

// Default empty response 
const emptyResponse: DashboardData = {
  stats: {
    totalRentals: 0,
    activeRentals: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    totalCustomers: 0,
    newCustomersThisMonth: 0,
    rentalsTrend: 0,
    revenueTrend: 0,
    customersTrend: 0
  },
  recentActivity: []
}; 