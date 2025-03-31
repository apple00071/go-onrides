import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    console.log('Testing database connection...');
    const db = await getDB();

    // Check if users table exists
    const usersTable = await db.get(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='users'
    `);

    if (!usersTable) {
      console.log('Creating users table...');
      await db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'worker')),
          status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_login TEXT
        )
      `);
    }

    // Check if there are any users, if not create a default admin user
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    
    if (userCount.count === 0) {
      console.log('Creating default admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.run(`
        INSERT INTO users (email, password, full_name, role, status)
        VALUES (?, ?, ?, ?, ?)
      `, [
        'admin@example.com',
        hashedPassword,
        'Admin User',
        'admin',
        'active'
      ]);
    }

    // Get database tables
    const tables = await db.all(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);

    // Get all users
    const users = await db.all('SELECT id, email, full_name, role, status, created_at, last_login FROM users');

    return NextResponse.json({
      success: true,
      message: 'Database is set up and working properly',
      tables: tables.map(t => t.name),
      userCount: users.length,
      users: users
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Database test failed', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 