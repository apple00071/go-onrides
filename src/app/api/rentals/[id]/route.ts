import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Get a single rental with detailed information
async function getRental(request: AuthenticatedRequest) {
  try {
    const rentalId = request.params?.id;
    if (!rentalId) {
      return NextResponse.json(
        { error: 'Rental ID is required' },
        { status: 400 }
      );
    }
    
    const db = await getDB();
    
    // Get the rental with related data
    const rental = await db.get(`
      SELECT 
        r.*,
        c.first_name, c.last_name, c.email, c.phone, c.address,
        c.father_phone, c.mother_phone, c.emergency_contact1, c.emergency_contact2,
        v.type as vehicle_type, v.model as vehicle_model, v.serial_number,
        u.full_name as worker_name
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      LEFT JOIN users u ON r.worker_id = u.id
      WHERE r.id = ?
    `, [rentalId]);
    
    if (!rental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      );
    }
    
    // Get payments associated with this rental
    const payments = await db.all(`
      SELECT p.*, u.full_name as received_by_name
      FROM payments p
      LEFT JOIN users u ON p.received_by = u.id
      WHERE p.rental_id = ?
      ORDER BY p.created_at DESC
    `, [rentalId]);
    
    return NextResponse.json({
      ...rental,
      payments
    });
  } catch (error) {
    console.error('Error fetching rental details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rental details' },
      { status: 500 }
    );
  }
}

// Update a rental - Admin only
async function updateRental(request: AuthenticatedRequest) {
  // Only admins can update rental details
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const rentalId = request.params?.id;
    if (!rentalId) {
      return NextResponse.json(
        { error: 'Rental ID is required' },
        { status: 400 }
      );
    }
    
    const db = await getDB();
    
    // Check if rental exists
    const rental = await db.get('SELECT * FROM rentals WHERE id = ?', [rentalId]);
    if (!rental) {
      return NextResponse.json(
        { error: 'Rental not found' },
        { status: 404 }
      );
    }
    
    const data = await request.json();
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Fields that can be updated
      const updatableFields = [
        'vehicle_id', 'start_date', 'end_date', 'status', 
        'base_price', 'additional_charges', 'discount', 'total_amount',
        'payment_status', 'payment_method', 'notes'
      ];
      
      const updates = [];
      const params = [];
      
      for (const field of updatableFields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(data[field]);
        }
      }
      
      // Always add updated_at
      updates.push('updated_at = datetime("now")');
      
      // If no fields to update, just return success
      if (updates.length <= 1) { // Only updated_at
        await db.run('ROLLBACK');
        return NextResponse.json({ message: 'No fields to update' });
      }
      
      // Add rental ID to params
      params.push(rentalId);
      
      // Update rental
      await db.run(
        `UPDATE rentals SET ${updates.join(', ')} WHERE id = ?`,
        params
      );
      
      // If vehicle_id was changed, update old and new vehicle statuses
      if (data.vehicle_id !== undefined && data.vehicle_id !== rental.vehicle_id) {
        // Set old vehicle to available
        if (rental.vehicle_id) {
          await db.run(
            'UPDATE vehicles SET status = ? WHERE id = ?',
            ['available', rental.vehicle_id]
          );
        }
        
        // Set new vehicle to rented
        if (data.vehicle_id) {
          await db.run(
            'UPDATE vehicles SET status = ? WHERE id = ?',
            ['rented', data.vehicle_id]
          );
        }
      }
      
      // Update customer information if provided
      if (data.customer && rental.customer_id) {
        const customerUpdates = [];
        const customerParams = [];
        
        const updatableCustomerFields = [
          'first_name', 'last_name', 'email', 'phone',
          'father_phone', 'mother_phone', 'emergency_contact1', 'emergency_contact2',
          'address', 'id_type', 'id_number', 'notes'
        ];
        
        for (const field of updatableCustomerFields) {
          if (data.customer[field] !== undefined) {
            customerUpdates.push(`${field} = ?`);
            customerParams.push(data.customer[field]);
          }
        }
        
        if (customerUpdates.length > 0) {
          // Add updated_at
          customerUpdates.push('updated_at = datetime("now")');
          
          // Add customer ID
          customerParams.push(rental.customer_id);
          
          // Update customer
          await db.run(
            `UPDATE customers SET ${customerUpdates.join(', ')} WHERE id = ?`,
            customerParams
          );
        }
      }
      
      await db.run('COMMIT');
      
      return NextResponse.json({ 
        message: 'Rental updated successfully',
        id: rentalId
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating rental:', error);
    return NextResponse.json(
      { error: 'Failed to update rental' },
      { status: 500 }
    );
  }
}

// Delete a rental - Admin only
async function deleteRental(request: AuthenticatedRequest) {
  // Only admins can delete rentals
  if (request.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    const rentalId = request.params?.id;
    if (!rentalId) {
      return NextResponse.json(
        { error: 'Rental ID is required' },
        { status: 400 }
      );
    }
    
    const db = await getDB();
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Check if rental exists
      const rental = await db.get('SELECT * FROM rentals WHERE id = ?', [rentalId]);
      
      if (!rental) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: 'Rental not found' },
          { status: 404 }
        );
      }
      
      // Check if there are payments for this rental
      const payments = await db.get(
        'SELECT COUNT(*) as count FROM payments WHERE rental_id = ?',
        [rentalId]
      );
      
      if (payments.count > 0) {
        await db.run('ROLLBACK');
        return NextResponse.json(
          { error: 'Cannot delete rental with payment records. Cancel it instead.' },
          { status: 400 }
        );
      }
      
      // Update vehicle status back to available if applicable
      if (rental.vehicle_id) {
        await db.run(
          'UPDATE vehicles SET status = ? WHERE id = ?',
          ['available', rental.vehicle_id]
        );
      }
      
      // Delete the rental
      await db.run('DELETE FROM rentals WHERE id = ?', [rentalId]);
      
      await db.run('COMMIT');
      
      return NextResponse.json({ 
        message: 'Rental deleted successfully'
      });
    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting rental:', error);
    return NextResponse.json(
      { error: 'Failed to delete rental' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getRental);
export const PATCH = withAuth(updateRental);
export const DELETE = withAuth(deleteRental); 