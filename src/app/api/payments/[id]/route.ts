import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Get a specific payment by ID
async function getPayment(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  // Get the payment ID from the URL params
  const paymentId = params.id;
  
  if (!paymentId) {
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }
  
  try {
    const db = await getDB();
    
    // Fetch payment with related data
    const payment = await db.get(`
      SELECT 
        p.*,
        r.rental_id,
        c.first_name, c.last_name, c.phone,
        u.full_name as received_by_name
      FROM payments p
      LEFT JOIN rentals r ON p.rental_id = r.id
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.id = ?
    `, [paymentId]);
    
    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment details' },
      { status: 500 }
    );
  }
}

// Update a payment
async function updatePayment(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  // Admin or worker authorization required
  if (!request.user || (request.user.role !== 'admin' && request.user.role !== 'worker')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const paymentId = params.id;
  
  if (!paymentId) {
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }
  
  try {
    const db = await getDB();
    
    // Check if payment exists
    const existingPayment = await db.get('SELECT * FROM payments WHERE id = ?', [paymentId]);
    
    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Only allow specific fields to be updated
    const allowedFields = ['amount', 'method', 'status', 'notes'];
    const updates: Record<string, any> = {};
    let hasUpdates = false;
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
        hasUpdates = true;
      }
    }
    
    if (!hasUpdates) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    
    // Validate the new values
    if (updates.amount !== undefined && (isNaN(updates.amount) || updates.amount <= 0)) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    
    if (updates.method !== undefined && !['cash', 'card', 'upi', 'other'].includes(updates.method)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }
    
    if (updates.status !== undefined && !['pending', 'completed', 'failed', 'refunded'].includes(updates.status)) {
      return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
    }
    
    // Start transaction for the update
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Build the SQL query
      const setClause = Object.keys(updates)
        .map(field => `${field} = ?`)
        .join(', ');
      
      const values = Object.values(updates);
      
      // Add updated_at field
      const updateQuery = `
        UPDATE payments
        SET ${setClause}, updated_at = datetime('now')
        WHERE id = ?
      `;
      
      await db.run(updateQuery, [...values, paymentId]);
      
      // If payment status is updated to "completed", update rental payment status
      if (updates.status === 'completed' && existingPayment.rental_id) {
        // Get total payments for the rental
        const totalPayments = await db.get(`
          SELECT SUM(amount) as total_paid
          FROM payments
          WHERE rental_id = ? AND status = 'completed'
        `, [existingPayment.rental_id]);
        
        // Get rental details
        const rental = await db.get(`
          SELECT id, total_amount
          FROM rentals
          WHERE id = ?
        `, [existingPayment.rental_id]);
        
        if (rental) {
          let paymentStatus = 'unpaid';
          
          // Calculate total paid including the current payment if it was just marked as completed
          const totalPaid = totalPayments ? totalPayments.total_paid : 0;
          
          // Determine payment status
          if (totalPaid >= rental.total_amount) {
            paymentStatus = 'paid';
          } else if (totalPaid > 0) {
            paymentStatus = 'partial';
          }
          
          // Update rental payment status
          await db.run(`
            UPDATE rentals
            SET payment_status = ?, updated_at = datetime('now')
            WHERE id = ?
          `, [paymentStatus, existingPayment.rental_id]);
        }
      }
      
      // Commit the transaction
      await db.run('COMMIT');
      
      // Fetch the updated payment
      const updatedPayment = await db.get(`
        SELECT * FROM payments WHERE id = ?
      `, [paymentId]);
      
      return NextResponse.json({
        message: 'Payment updated successfully',
        payment: updatedPayment
      });
    } catch (transactionError) {
      // Rollback the transaction if any error occurs
      await db.run('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    );
  }
}

// Delete a payment
async function deletePayment(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  // Only admins can delete payments
  if (!request.user || request.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }
  
  const paymentId = params.id;
  
  if (!paymentId) {
    return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
  }
  
  try {
    const db = await getDB();
    
    // Check if payment exists
    const existingPayment = await db.get('SELECT * FROM payments WHERE id = ?', [paymentId]);
    
    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Delete the payment
      await db.run('DELETE FROM payments WHERE id = ?', [paymentId]);
      
      // If the payment was completed, update the rental payment status
      if (existingPayment.status === 'completed' && existingPayment.rental_id) {
        // Get remaining payments for the rental
        const remainingPayments = await db.get(`
          SELECT SUM(amount) as total_paid
          FROM payments
          WHERE rental_id = ? AND status = 'completed'
        `, [existingPayment.rental_id]);
        
        // Get rental details
        const rental = await db.get(`
          SELECT id, total_amount
          FROM rentals
          WHERE id = ?
        `, [existingPayment.rental_id]);
        
        if (rental) {
          let paymentStatus = 'unpaid';
          
          // Calculate remaining payments
          const totalPaid = remainingPayments ? remainingPayments.total_paid : 0;
          
          // Determine payment status
          if (totalPaid >= rental.total_amount) {
            paymentStatus = 'paid';
          } else if (totalPaid > 0) {
            paymentStatus = 'partial';
          }
          
          // Update rental payment status
          await db.run(`
            UPDATE rentals
            SET payment_status = ?, updated_at = datetime('now')
            WHERE id = ?
          `, [paymentStatus, existingPayment.rental_id]);
        }
      }
      
      // Commit the transaction
      await db.run('COMMIT');
      
      return NextResponse.json({
        message: 'Payment deleted successfully'
      });
    } catch (transactionError) {
      // Rollback the transaction if any error occurs
      await db.run('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    console.error('Error deleting payment:', error);
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getPayment);
export const PATCH = withAuth(updatePayment);
export const DELETE = withAuth(deletePayment); 