import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../../config';

async function handler(request: AuthenticatedRequest) {
  try {
    const userId = request.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in request' },
        { status: 400 }
      );
    }

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, role, status, created_at, last_login_at, permissions')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        status: user.status,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler); 