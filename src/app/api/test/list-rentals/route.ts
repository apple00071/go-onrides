import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    console.log('Listing all rentals for testing...');
    const db = await getDB();
    
    // Get rentals with customer and vehicle details
    const rentals = await db.all(`
      SELECT 
        r.*,
        c.first_name || ' ' || c.last_name as customer_name,
        v.model as vehicle_model,
        v.type as vehicle_type
      FROM rentals r
      LEFT JOIN customers c ON r.customer_id = c.id
      LEFT JOIN vehicles v ON r.vehicle_id = v.id
      ORDER BY r.created_at DESC
    `);
    
    return NextResponse.json({
      count: rentals.length,
      rentals
    });
  } catch (error) {
    console.error('Error listing rentals:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list rentals', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 