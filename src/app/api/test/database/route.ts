import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

interface TableStructure {
  [key: string]: ColumnInfo[] | number;
}

export async function GET() {
  try {
    console.log('Testing database connection...');
    const db = await getDB();
    
    // Get table information
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    
    // For each table, get the structure
    const tableStructure: TableStructure = {};
    for (const table of tables) {
      if (table.name.startsWith('sqlite_')) continue;
      
      const columns = await db.all(`PRAGMA table_info(${table.name})`);
      tableStructure[table.name] = columns;
      
      // Get the count of records
      const countResult = await db.get(`SELECT COUNT(*) as count FROM ${table.name}`);
      tableStructure[`${table.name}_count`] = countResult.count;
    }
    
    return NextResponse.json({
      status: 'Database connection successful',
      tables: tables.map(t => t.name),
      structure: tableStructure
    });
  } catch (error) {
    console.error('Error connecting to database:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to database', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 