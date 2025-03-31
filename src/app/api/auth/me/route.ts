import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../../config';

async function handler(request: AuthenticatedRequest) {
  try {
    if (!request.user) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized' 
        },
        { status: 401 }
      );
    }

    // User is already authenticated and available in request.user
    // Optionally fetch additional user data from the database
    if (request.user.id) {
      const db = await getDB();
      const userData = await db.get(
        `SELECT u.id, u.email, u.full_name, u.role, u.status, u.created_at, u.last_login_at_at_at_at,
                u.permissions
         FROM users u
         WHERE u.id = ?`,
        [request.user.id]
      );

      if (userData) {
        // Parse permissions from string to array if it exists
        const permissions = userData.permissions ? JSON.parse(userData.permissions) : [];
        
        return NextResponse.json({
          success: true,
          data: {
            ...userData,
            permissions
          }
        });
      }
    }

    // Fallback to just returning the user from the token
    return NextResponse.json({
      success: true,
      data: request.user
    });
  } catch (error) {
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler); 