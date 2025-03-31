import { NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Original authenticated endpoint
async function getVehicles(request: AuthenticatedRequest) {
  try {
    console.log('Fetching vehicles...');
    
    // Check if Supabase client is properly initialized
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      console.error('Supabase configuration is missing');
      return NextResponse.json({
        success: false,
        error: 'Database configuration error',
        details: 'Unable to connect to the database'
      }, { status: 500 });
    }

    const { data: vehicles, error } = await supabase
      .from(TABLES.VEHICLES)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json({
        success: false,
        error: 'Database query error',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      vehicles: vehicles || []
    });
  } catch (error) {
    console.error('Error in vehicles endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch vehicles',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Adding a non-authenticated endpoint for testing
export const GET = withAuth(getVehicles);

async function createVehicle(request: AuthenticatedRequest) {
  try {
    const data = await request.json();
    console.log('Creating vehicle with data:', data);
    
    // Validate required fields
    if (!data.type || !data.model || !data.number_plate || !data.daily_rate) {
      return NextResponse.json(
        { error: 'Type, model, number plate, and daily rate are required' },
        { status: 400 }
      );
    }

    // Convert daily_rate to number and validate
    const daily_rate = parseFloat(data.daily_rate);
    if (isNaN(daily_rate) || daily_rate < 0) {
      return NextResponse.json(
        { error: 'Daily rate must be a valid positive number' },
        { status: 400 }
      );
    }
    
    // Check if number plate is already used
    const { data: existingVehicle, error: checkError } = await supabase
      .from(TABLES.VEHICLES)
      .select('id')
      .eq('number_plate', data.number_plate)
      .single();

    console.log('Check for existing vehicle:', { existingVehicle, checkError });

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'A vehicle with this number plate already exists' },
        { status: 400 }
      );
    }
    
    // Create new vehicle
    const { data: newVehicle, error: createError } = await supabase
      .from(TABLES.VEHICLES)
      .insert({
        type: data.type,
        model: data.model,
        number_plate: data.number_plate,
        status: data.status || 'available',
        daily_rate: daily_rate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    console.log('Create vehicle result:', { newVehicle, createError });

    if (createError) {
      console.error('Error creating vehicle:', createError);
      throw createError;
    }
    
    return NextResponse.json({
      success: true,
      vehicle: newVehicle
    });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Original API routes with authentication
export const POST = withAuth(createVehicle);