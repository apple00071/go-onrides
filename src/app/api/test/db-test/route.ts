import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  let db = null;
  
  try {
    db = await getDB();
    
    // Check database version
    const version = await db.get('SELECT sqlite_version() as version');
    
    // Check what tables exist
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table'
      ORDER BY name
    `);
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection successful',
      data: {
        version,
        tables
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: String(error)
    }, { status: 500 });
  } finally {
    if (db) {
      try {
        await db.close();
      } catch (err) {
        console.error('Error closing database:', err);
      }
    }
  }
} 