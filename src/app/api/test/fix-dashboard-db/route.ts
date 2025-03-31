import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  let db = null;
  try {
    console.log('Fixing dashboard database issues...');
    db = await getDB();

    // Fix missing amount column in rentals table
    const columns = await db.all(`PRAGMA table_info(rentals)`);
    const hasAmountColumn = columns.some(col => col.name === 'amount');
    
    if (!hasAmountColumn) {
      console.log('Adding missing amount column to rentals table');
      await db.exec(`ALTER TABLE rentals ADD COLUMN amount REAL`);
      
      // Set amount equal to total_amount for existing records
      await db.exec(`UPDATE rentals SET amount = total_amount WHERE amount IS NULL`);
      console.log('Added amount column and updated values');
    } else {
      console.log('Amount column already exists');
    }

    // Verify columns
    const updatedColumns = await db.all(`PRAGMA table_info(rentals)`);
    
    return NextResponse.json({
      success: true,
      message: 'Fixed dashboard database issues',
      columns: updatedColumns.map(col => col.name)
    });
    
  } catch (error) {
    console.error('Error fixing dashboard database:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fix dashboard database', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  } finally {
    // Important: Close the database connection properly
    if (db) {
      try {
        await db.close();
        console.log('Database connection closed properly');
      } catch (err) {
        console.error('Error closing database:', err);
      }
    }
  }
} 