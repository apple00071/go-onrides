import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { promises as fs } from 'fs';

let db: any = null;

export async function getDB(): Promise<Database> {
  if (db) return db;

  try {
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
      console.log(`Data directory created/verified at: ${dataDir}`);
    } catch (err) {
      console.error('Error creating data directory:', err);
    }

    const dbPath = path.join(dataDir, 'database.sqlite');
    console.log(`Attempting to open database at: ${dbPath}`);
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('Database connection established successfully');

    // Create a simple test table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Test table created/verified');

    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
} 