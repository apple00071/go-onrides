import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '@/types';

// Get a single user
async function getUser(request: AuthenticatedRequest) {
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    // Extract ID from URL path
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const db = await getDB();
    const user = await db.get(
      `SELECT id, username, role, full_name, email, phone, status, permissions, created_at, last_login_at 
       FROM users WHERE id = ?`,
      [userId]
    );
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse permissions from JSON string
    if (user.permissions) {
      try {
        user.permissions = JSON.parse(user.permissions);
      } catch (err) {
        console.error('Error parsing permissions:', err);
        user.permissions = [];
      }
    } else {
      user.permissions = [];
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// Update a user
async function updateUser(request: AuthenticatedRequest) {
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    // Extract ID from URL path
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Get the current user to ensure they exist
    const db = await getDB();
    const existingUser = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    const data = await request.json();
    const { role, full_name, email, phone, status, password, permissions } = data;
    
    // Build update query parts
    let updateFields = [];
    let params = [];
    
    if (role !== undefined) {
      // Validate role
      if (role !== 'admin' && role !== 'worker') {
        return NextResponse.json(
          { error: 'Role must be either "admin" or "worker"' },
          { status: 400 }
        );
      }
      updateFields.push('role = ?');
      params.push(role);
    }
    
    if (full_name !== undefined) {
      updateFields.push('full_name = ?');
      params.push(full_name);
    }
    
    if (email !== undefined) {
      updateFields.push('email = ?');
      params.push(email);
    }
    
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      params.push(phone);
    }
    
    if (status !== undefined) {
      // Validate status
      if (status !== 'active' && status !== 'inactive') {
        return NextResponse.json(
          { error: 'Status must be either "active" or "inactive"' },
          { status: 400 }
        );
      }
      updateFields.push('status = ?');
      params.push(status);
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      params.push(hashedPassword);
    }

    if (permissions !== undefined) {
      updateFields.push('permissions = ?');
      params.push(JSON.stringify(permissions));
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }
    
    // Add ID to params
    params.push(userId);
    
    // Update user
    await db.run(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      params
    );
    
    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// Delete a user
async function deleteUser(request: AuthenticatedRequest) {
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    // Extract ID from URL path
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const db = await getDB();
    
    // Check if user exists and get their details
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of hardcoded admin user
    if (user.email === 'gonriders6@gmail.com') {
      return NextResponse.json(
        { error: 'Cannot delete the main administrator account' },
        { status: 403 }
      );
    }
    
    // Prevent admin from deleting their own account
    if (userId === request.user.id.toString()) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }
    
    // Delete the user
    await db.run('DELETE FROM users WHERE id = ?', [userId]);
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getUser);
export const PATCH = withAuth(updateUser);
export const DELETE = withAuth(deleteUser); 