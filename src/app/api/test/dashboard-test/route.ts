import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  let db = null;
  
  try {
    db = await getDB();
    
    // Check if rentals table exists and has the necessary columns
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='rentals'
    `);
    
    if (tables.length === 0) {
      return NextResponse.json({ 
        status: 'no_table', 
        message: 'Rentals table does not exist',
        tables: await db.all(`SELECT name FROM sqlite_master WHERE type='table'`)
      });
    }
    
    // Check column structure
    const columns = await db.all(`PRAGMA table_info(rentals)`);
    const hasAmountColumn = columns.some(col => col.name === 'amount');
    
    let amountColumn = 'amount';
    if (!hasAmountColumn) {
      // Fallback to total_amount if amount doesn't exist
      amountColumn = 'total_amount';
    }

    // Simple test query that mimics the dashboard query
    const rentalStats = await db.get(`
      SELECT 
        COUNT(*) as totalRentals,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeRentals,
        SUM(${amountColumn}) as totalRevenue,
        SUM(CASE WHEN payment_status = 'pending' THEN ${amountColumn} ELSE 0 END) as pendingPayments
      FROM rentals
    `);

    return NextResponse.json({
      status: 'success',
      columnInfo: {
        hasAmountColumn,
        usingColumn: amountColumn,
        allColumns: columns.map(c => c.name)
      },
      stats: {
        totalRentals: rentalStats?.totalRentals || 0,
        activeRentals: rentalStats?.activeRentals || 0,
        totalRevenue: rentalStats?.totalRevenue || 0,
        pendingPayments: rentalStats?.pendingPayments || 0
      }
    });
    
  } catch (error) {
    console.error('Dashboard test error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Error retrieving dashboard test data',
      error: String(error)
    }, { status: 500 });
  } finally {
    // Properly close database connection
    if (db) {
      try {
        await db.close();
      } catch (err) {
        console.error('Error closing database:', err);
      }
    }
  }
} 