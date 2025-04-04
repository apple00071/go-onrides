import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '@/types';

// GET user by ID
async function getUser(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, role, full_name, email, phone, status, created_at, last_login_at, permissions')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*')
      .eq('worker_id', params.id);

    // Get user's payments
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('received_by', params.id);

    // Get user's maintenance records
    const { data: maintenance } = await supabase
      .from('maintenance')
      .select('*')
      .eq('worker_id', params.id);

    // Calculate activity metrics
    const stats = {
      totalActions: (bookings?.length || 0) + (payments?.length || 0) + (maintenance?.length || 0),
      bookingsCreated: bookings?.length || 0,
      bookingsCompleted: bookings?.filter(r => r.status === 'completed').length || 0,
      paymentsReceived: payments?.length || 0,
      paymentsAmount: payments?.reduce((sum, p) => sum + p.amount, 0) || 0,
      maintenanceRecords: maintenance?.length || 0
    };

    return NextResponse.json({
      user: {
        ...user,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// Update user
async function updateUser(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const data = await request.json();
    const { password, ...updateData } = data;

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', params.id)
      .single();

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // If password is provided, hash it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Update user
    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// Delete user
async function deleteUser(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', params.id)
      .single();

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting the last admin
    if (existingUser.role === 'admin') {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (count === 1) {
        return NextResponse.json(
          { error: 'Cannot delete the last admin user' },
          { status: 400 }
        );
      }
    }

    // Delete user
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', params.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getUser);
export const PUT = withAuth(updateUser);
export const DELETE = withAuth(deleteUser); 