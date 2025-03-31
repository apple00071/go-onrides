import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

interface Payment {
  id: number;
  rental_id: number;
  amount: number;
  method: 'cash' | 'card' | 'upi' | 'other';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  received_by: number;
  notes?: string;
  created_at: string;
}

// Get all payments with filtering options
async function getPayments(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const db = await getDB();
    
    // Build the query with filtering options
    let query = `
      SELECT 
        p.*,
        r.rental_id,
        c.first_name, c.last_name, c.phone,
        u.full_name as received_by_name
      FROM payments p
      LEFT JOIN rentals r ON p.rental_id = r.id
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN users u ON p.received_by = u.id
      WHERE 1=1
    `;
    
    const queryParams: any[] = [];
    
    // Filter by rental ID
    if (searchParams.has('rental_id')) {
      query += ' AND r.rental_id = ?';
      queryParams.push(searchParams.get('rental_id'));
    }
    
    // Filter by payment method
    if (searchParams.has('method')) {
      query += ' AND p.method = ?';
      queryParams.push(searchParams.get('method'));
    }
    
    // Filter by payment status
    if (searchParams.has('status')) {
      query += ' AND p.status = ?';
      queryParams.push(searchParams.get('status'));
    }
    
    // Filter by date range
    if (searchParams.has('start_date')) {
      query += ' AND date(p.created_at) >= date(?)';
      queryParams.push(searchParams.get('start_date'));
    }
    
    if (searchParams.has('end_date')) {
      query += ' AND date(p.created_at) <= date(?)';
      queryParams.push(searchParams.get('end_date'));
    }
    
    // Filter by customer
    if (searchParams.has('customer')) {
      const customerSearch = `%${searchParams.get('customer')}%`;
      query += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ?)';
      queryParams.push(customerSearch, customerSearch, customerSearch);
    }
    
    // Add sorting options
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const validSortFields = ['created_at', 'amount', 'method', 'status'];
    
    const sortOrder = searchParams.get('sort_order')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    if (validSortFields.includes(sortBy)) {
      query += ` ORDER BY p.${sortBy} ${sortOrder}`;
    } else {
      query += ` ORDER BY p.created_at DESC`;
    }
    
    // Add pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '20');
    
    // Ensure page and page_size are valid
    const validPage = page > 0 ? page : 1;
    const validPageSize = pageSize > 0 && pageSize <= 100 ? pageSize : 20;
    
    const offset = (validPage - 1) * validPageSize;
    
    query += ' LIMIT ? OFFSET ?';
    queryParams.push(validPageSize, offset);
    
    // Execute the query
    const payments = await db.all(query, queryParams);
    
    // Get the total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      LEFT JOIN rentals r ON p.rental_id = r.id
      LEFT JOIN customers c ON r.customer_id = c.id
      WHERE 1=1
    `;
    
    // Add the same filters to the count query
    if (searchParams.has('rental_id')) {
      countQuery += ' AND r.rental_id = ?';
    }
    
    if (searchParams.has('method')) {
      countQuery += ' AND p.method = ?';
    }
    
    if (searchParams.has('status')) {
      countQuery += ' AND p.status = ?';
    }
    
    if (searchParams.has('start_date')) {
      countQuery += ' AND date(p.created_at) >= date(?)';
    }
    
    if (searchParams.has('end_date')) {
      countQuery += ' AND date(p.created_at) <= date(?)';
    }
    
    if (searchParams.has('customer')) {
      countQuery += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.phone LIKE ?)';
    }
    
    const countParams = queryParams.slice(0, -2); // Remove the LIMIT and OFFSET params
    const { total } = await db.get(countQuery, countParams);
    
    // Calculate pagination metadata
    const totalPages = Math.ceil(total / validPageSize);
    
    return NextResponse.json({
      payments,
      pagination: {
        total,
        page: validPage,
        page_size: validPageSize,
        total_pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// Create a new payment
async function createPayment(request: AuthenticatedRequest) {
  // Ensure user is authenticated and is admin or worker
  if (!request.user || (request.user.role !== 'admin' && request.user.role !== 'worker')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  try {
    // Get request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.rental_id) {
      return NextResponse.json({ error: 'Rental ID is required' }, { status: 400 });
    }
    
    if (!body.amount || isNaN(body.amount) || body.amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }
    
    if (!body.method || !['cash', 'card', 'upi', 'other'].includes(body.method)) {
      return NextResponse.json({ error: 'Valid payment method is required' }, { status: 400 });
    }
    
    const db = await getDB();
    
    // Verify rental exists
    const rental = await db.get(`
      SELECT id, rental_id, total_amount, payment_status
      FROM rentals
      WHERE id = ?
    `, [body.rental_id]);
    
    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 });
    }
    
    // Start transaction
    await db.run('BEGIN TRANSACTION');
    
    try {
      // Insert the payment
      const result = await db.run(`
        INSERT INTO payments (
          rental_id, amount, method, status, notes, received_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        body.rental_id,
        body.amount,
        body.method,
        body.status || 'completed', // Default to completed
        body.notes || '',
        request.user.id
      ]);
      
      const paymentId = result.lastID;
      
      // If payment is marked as completed, update the rental payment status
      if ((body.status || 'completed') === 'completed') {
        // Get total payments for the rental
        const totalPayments = await db.get(`
          SELECT SUM(amount) as total_paid
          FROM payments
          WHERE rental_id = ? AND status = 'completed'
        `, [body.rental_id]);
        
        let paymentStatus = 'unpaid';
        
        // Calculate total paid including the current payment
        const totalPaid = (totalPayments ? totalPayments.total_paid : 0) + body.amount;
        
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
        `, [paymentStatus, body.rental_id]);
      }
      
      // Commit the transaction
      await db.run('COMMIT');
      
      // Fetch the created payment
      const payment = await db.get(`
        SELECT * FROM payments WHERE id = ?
      `, [paymentId]);
      
      return NextResponse.json({
        message: 'Payment created successfully',
        payment
      }, { status: 201 });
    } catch (transactionError) {
      // Rollback the transaction if any error occurs
      await db.run('ROLLBACK');
      throw transactionError;
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getPayments);
export const POST = withAuth(createPayment); 