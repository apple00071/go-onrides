import { NextResponse } from 'next/server';
import { getDB } from '@/lib/test-db';

export async function GET() {
  let db = null;
  
  try {
    db = await getDB();
    
    // Insert a test record
    await db.run('INSERT INTO test_table (name) VALUES (?)', ['Test entry ' + new Date().toISOString()]);
    
    // Retrieve test records
    const records = await db.all('SELECT * FROM test_table ORDER BY id DESC LIMIT 5');
    
    return NextResponse.json({
      status: 'success',
      message: 'Database test completed successfully',
      data: {
        records
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database test failed',
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