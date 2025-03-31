import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

async function handler(request: AuthenticatedRequest) {
  try {
    const id = request.params?.id;
    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const { status } = await request.json();
    
    // Validate status
    const validStatuses = ['available', 'rented', 'maintenance', 'retired'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be one of: available, rented, maintenance, retired' },
        { status: 400 }
      );
    }

    const db = await getDB();

    // Update vehicle status
    await db.run(
      `UPDATE vehicles 
       SET status = ? 
       WHERE id = ?`,
      [status, id]
    );

    return NextResponse.json({ 
      message: 'Vehicle status updated successfully',
      vehicleId: id,
      newStatus: status
    });
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(handler); 