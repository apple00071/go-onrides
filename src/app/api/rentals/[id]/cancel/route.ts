import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

async function handler(request: AuthenticatedRequest) {
  try {
    // Only admins should be able to cancel rentals
    if (request.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const id = request.params?.id;
    if (!id) {
      return NextResponse.json(
        { error: 'Rental ID is required' },
        { status: 400 }
      );
    }

    const { reason } = await request.json();
    const db = await getDB();

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Check if rental exists and is not already completed or cancelled
      const rental = await db.get(
        'SELECT r.*, v.id as vehicle_id FROM rentals r LEFT JOIN vehicles v ON r.vehicle_id = v.id WHERE r.id = ?',
        [id]
      );

      if (!rental) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: 'Rental not found' },
          { status: 404 }
        );
      }

      if (rental.status === 'completed' || rental.status === 'cancelled') {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: `Cannot cancel a rental that is already ${rental.status}` },
          { status: 400 }
        );
      }

      // Update rental status
      await db.run(
        `UPDATE rentals 
        SET status = ?, 
            updated_at = datetime('now'),
            notes = CASE WHEN notes IS NULL OR trim(notes) = '' 
                     THEN ? 
                     ELSE notes || ' | Cancellation: ' || ? 
                   END
        WHERE id = ?`,
        ['cancelled', reason, reason, id]
      );

      // Update vehicle status back to available if it exists
      if (rental.vehicle_id) {
        await db.run(
          'UPDATE vehicles SET status = ? WHERE id = ?',
          ['available', rental.vehicle_id]
        );
      }

      await db.run('COMMIT');

      return NextResponse.json({ 
        message: 'Rental cancelled successfully',
        rentalId: id
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error cancelling rental:', error);
    return NextResponse.json(
      { error: 'Failed to cancel rental' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler); 