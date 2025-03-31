import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '@/types';

// GET all users
async function getUsers(request: AuthenticatedRequest) {
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const sortField = searchParams.get('sort') || 'created_at';
    const sortOrder = searchParams.get('order') || 'desc';
    
    const db = await getDB();
    const users = await db.all(`
      SELECT id, username as name, role, full_name, email, phone, status, created_at, last_login_at 
      FROM users 
      ORDER BY ${sortField} ${sortOrder}
    `);
    
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Create new user
async function createUser(request: AuthenticatedRequest) {
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const data = await request.json();
    const { username, password, role, full_name, email, phone, permissions } = data;
    
    // Validate required fields
    if (!username || !password || !role || !full_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Validate role
    if (role !== 'admin' && role !== 'worker') {
      return NextResponse.json(
        { error: 'Role must be either "admin" or "worker"' },
        { status: 400 }
      );
    }
    
    // Check if username already exists
    const db = await getDB();
    const existingUser = await db.get('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set default permissions for worker if none provided
    let userPermissions = permissions;
    if (role === 'worker' && (!permissions || permissions.length === 0)) {
      userPermissions = [
        'dashboard.stats',
        'bookings.view',
        'bookings.create',
        'bookings.update',
        'vehicles.view',
        'customers.view',
        'customers.create'
      ];
    }
    
    // Insert user
    const result = await db.run(
      `INSERT INTO users (username, password, role, full_name, email, phone, status, permissions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        username, 
        hashedPassword, 
        role, 
        full_name, 
        email, 
        phone || null, 
        'active',
        JSON.stringify(userPermissions || [])
      ]
    );
    
    return NextResponse.json({ 
      message: 'User created successfully',
      userId: result.lastID
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// Export the protected routes
const protectedGetUsers = withAuth(getUsers);
const protectedCreateUser = withAuth(createUser);

export { protectedGetUsers as GET, protectedCreateUser as POST }; 