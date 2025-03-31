import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    console.log('Attempting to fix login issue...');
    const db = await getDB();
    
    // Check if the last_login column exists in the users table
    const tableInfo = await db.all(`PRAGMA table_info(users)`);
    const lastLoginColumn = tableInfo.find(column => column.name === 'last_login');
    
    if (!lastLoginColumn) {
      console.log('Adding missing last_login column to users table...');
      await db.exec(`ALTER TABLE users ADD COLUMN last_login TEXT`);
      console.log('Successfully added last_login column');
    } else {
      console.log('last_login column already exists');
    }
    
    // Verify the change
    const updatedTableInfo = await db.all(`PRAGMA table_info(users)`);
    const columns = updatedTableInfo.map(col => col.name);
    
    return NextResponse.json({
      success: true,
      message: 'Fixed login issue',
      columns
    });
    
  } catch (error) {
    console.error('Error fixing login issue:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fix login issue', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 