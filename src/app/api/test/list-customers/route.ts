import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    console.log('Listing all customers for testing...');
    const db = await getDB();
    
    const customers = await db.all('SELECT * FROM customers');
    
    return NextResponse.json({
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('Error listing customers:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list customers', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 