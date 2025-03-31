import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

async function handler(request: AuthenticatedRequest) {
  try {
    const id = request.params?.id;
    if (!id) {
      return NextResponse.json(
        { error: 'Rental ID is required' },
        { status: 400 }
      );
    }

    const { remarks } = await request.json();
    const db = await getDB();

    // Update rental status
    await db.run(
      `UPDATE rentals 
       SET status = ?, 
           actual_return_date = CURRENT_TIMESTAMP,
           notes = ? 
       WHERE rental_id = ?`,
      ['completed', remarks, id]
    );

    return NextResponse.json({ message: 'Rental updated successfully' });
  } catch (error) {
    console.error('Error updating rental:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(handler); 