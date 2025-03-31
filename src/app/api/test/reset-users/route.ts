import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    console.log('Resetting users table...');
    const db = await getDB();

    // Drop the users table if it exists
    await db.exec('DROP TABLE IF EXISTS users');
    console.log('Dropped users table');

    // Create users table with the correct schema
    await db.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'worker')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        permissions TEXT,
        phone TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login_at TEXT
      )
    `);
    console.log('Created new users table with correct schema');

    // Create admin user with all permissions - using 12 rounds for better security
    const adminPassword = await bcrypt.hash('Goonriders123!', 12);
    await db.run(
      `INSERT INTO users (email, username, password, full_name, role, status, permissions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'goonriders6@gmail.com',
        'admin',
        adminPassword,
        'Goonriders Admin',
        'admin',
        'active',
        JSON.stringify(['*']) // Admin has all permissions
      ]
    );
    console.log('Created admin user');

    // Verify users
    const users = await db.all('SELECT id, email, full_name, role, permissions FROM users');

    return NextResponse.json({
      success: true,
      message: 'Users table reset successfully',
      users: users.map(user => ({
        ...user,
        permissions: user.permissions ? JSON.parse(user.permissions) : []
      }))
    });
  } catch (error) {
    console.error('Error resetting users table:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to reset users table', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 