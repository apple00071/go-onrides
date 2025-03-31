import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Create an empty database file if it doesn't exist
    const dbPath = path.join(dataDir, 'database.sqlite');
    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, '');
      console.log(`Created empty database file at ${dbPath}`);
    }
    
    // Set permissions to the database file
    try {
      fs.chmodSync(dbPath, 0o666);
      console.log(`Set permissions for database file`);
    } catch (err) {
      console.error('Error setting permissions:', err);
    }
    
    // Initialize database
    console.log('Attempting to initialize database...');
    const db = await getDB();
    console.log('Database connection successful');
    
    // Run a simple query to verify connection
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
      dbPath,
      tables: tables.map(t => t.name)
    });
    
  } catch (error) {
    console.error('Database initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database initialization failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined 
      },
      { status: 500 }
    );
  }
} 