import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    console.log('Listing all vehicles for testing...');
    const db = await getDB();
    
    const vehicles = await db.all('SELECT * FROM vehicles');
    
    return NextResponse.json({
      count: vehicles.length,
      vehicles
    });
  } catch (error) {
    console.error('Error listing vehicles:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list vehicles', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 