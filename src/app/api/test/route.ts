import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { migrateUsers } from './migrate';

// Define interface for column information returned by SQLite
interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  default_value: any;
  pk: number;
  cid: number;
}

export async function GET() {
  try {
    console.log('Testing database connection...');
    const db = await getDB();
    
    // Get database schema information
    const tables = await db.all(`
      SELECT 
        name
      FROM 
        sqlite_master
      WHERE 
        type='table'
    `);
    
    const tableDetails = [];
    
    for (const table of tables) {
      if (table.name !== 'sqlite_sequence') {
        const columns = await db.all(`PRAGMA table_info(${table.name})`);
        tableDetails.push({
          name: table.name,
          columns: columns.map((col: ColumnInfo) => ({
            name: col.name,
            type: col.type
          }))
        });
      }
    }
    
    // Run the migration if needed
    const migrationResult = await migrateUsers();
    
    return NextResponse.json({
      message: 'Database connection successful',
      tables: tableDetails,
      migration: migrationResult
    });
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { error: 'Database test failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 