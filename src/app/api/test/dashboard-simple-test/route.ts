import { NextResponse } from 'next/server';
import { getDB } from '@/lib/test-db';

export async function GET() {
  let db = null;
  
  try {
    db = await getDB();
    
    // Create a simple rentals table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS test_rentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT,
        status TEXT,
        start_date TEXT,
        end_date TEXT,
        total_amount REAL,
        payment_status TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert some sample data if the table is empty
    const count = await db.get('SELECT COUNT(*) as count FROM test_rentals');
    if (count.count === 0) {
      const sampleData = [
        ['John Doe', 'active', '2025-03-01', '2025-03-10', 500.00, 'paid'],
        ['Jane Smith', 'completed', '2025-02-15', '2025-02-20', 250.00, 'paid'],
        ['Bob Johnson', 'active', '2025-03-05', '2025-03-15', 400.00, 'pending'],
        ['Alice Brown', 'pending', '2025-03-10', '2025-03-20', 600.00, 'pending'],
        ['Charlie Davis', 'completed', '2025-01-20', '2025-01-25', 300.00, 'paid']
      ];
      
      for (const item of sampleData) {
        await db.run(`
          INSERT INTO test_rentals (customer_name, status, start_date, end_date, total_amount, payment_status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, item);
      }
    }
    
    // Calculate dashboard stats
    const totalRentals = await db.get('SELECT COUNT(*) as count FROM test_rentals');
    const activeRentals = await db.get('SELECT COUNT(*) as count FROM test_rentals WHERE status = "active"');
    const totalRevenue = await db.get('SELECT SUM(total_amount) as sum FROM test_rentals WHERE payment_status = "paid"');
    const pendingPayments = await db.get('SELECT SUM(total_amount) as sum FROM test_rentals WHERE payment_status = "pending"');
    
    // Retrieve recent rentals
    const recentRentals = await db.all('SELECT * FROM test_rentals ORDER BY id DESC LIMIT 5');
    
    return NextResponse.json({
      status: 'success',
      data: {
        stats: {
          totalRentals: totalRentals.count,
          activeRentals: activeRentals.count,
          totalRevenue: totalRevenue.sum || 0,
          pendingPayments: pendingPayments.sum || 0
        },
        recentRentals
      }
    });
  } catch (error) {
    console.error('Dashboard test error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Error retrieving dashboard data',
      error: String(error)
    }, { status: 500 });
  } finally {
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