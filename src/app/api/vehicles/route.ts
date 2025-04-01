import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic } from '../config';

// Set cache headers for better performance
export const revalidate = 0; // No cache

async function getVehicles(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100'); // Increased limit to show more vehicles by default
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('vehicles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`
        model.ilike.%${search}%,
        number_plate.ilike.%${search}%
      `);
    }

    // Apply pagination
    const { data: vehicles, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching vehicles:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vehicles' },
        { status: 500 }
      );
    }

    console.log(`Fetched ${vehicles?.length || 0} vehicles`);

    return NextResponse.json({
      success: true,
      data: {
        vehicles: vehicles || [],
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      // For backwards compatibility, include vehicles at the root level too
      vehicles: vehicles || []
    });
  } catch (error) {
    console.error('Error in vehicles endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createVehicle(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const {
      type,
      model,
      number_plate,
      daily_rate,
      status = 'available',
      manufacturer = null,
      year = null,
      color = null
    } = body;

    if (!type || !model || !number_plate || !daily_rate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if vehicle with same number plate exists
    const { data: existingVehicle } = await supabase
      .from('vehicles')
      .select('id')
      .eq('number_plate', number_plate)
      .single();

    if (existingVehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle with this number plate already exists' },
        { status: 400 }
      );
    }

    // First, ensure all potentially missing columns exist in the schema
    try {
      await supabase.rpc('execute_sql', {
        sql_string: `
          DO $$
          BEGIN
            -- Check and add color column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'vehicles' AND column_name = 'color'
            ) THEN
              ALTER TABLE vehicles ADD COLUMN color TEXT;
              RAISE NOTICE 'Added missing color column to vehicles table';
            END IF;
            
            -- Check and add manufacturer column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'vehicles' AND column_name = 'manufacturer'
            ) THEN
              ALTER TABLE vehicles ADD COLUMN manufacturer TEXT;
              RAISE NOTICE 'Added missing manufacturer column to vehicles table';
            END IF;
            
            -- Check and add year column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'vehicles' AND column_name = 'year'
            ) THEN
              ALTER TABLE vehicles ADD COLUMN year INTEGER;
              RAISE NOTICE 'Added missing year column to vehicles table';
            END IF;
            
            -- Check and add hourly_rate column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'vehicles' AND column_name = 'hourly_rate'
            ) THEN
              ALTER TABLE vehicles ADD COLUMN hourly_rate DECIMAL(10,2);
              RAISE NOTICE 'Added missing hourly_rate column to vehicles table';
            END IF;
            
            -- Check and add weekly_rate column if missing
            IF NOT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_name = 'vehicles' AND column_name = 'weekly_rate'
            ) THEN
              ALTER TABLE vehicles ADD COLUMN weekly_rate DECIMAL(10,2);
              RAISE NOTICE 'Added missing weekly_rate column to vehicles table';
            END IF;
          END $$;
        `
      });
      console.log('Fixed database schema: added any missing columns to vehicles table');
    } catch (schemaError) {
      // Log the error, but still try to create the vehicle with only required fields
      console.error('Failed to fix schema before creating vehicle:', schemaError);
    }

    // Now try a basic insert with only required fields first
    try {
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .insert({
          type,
          model,
          number_plate,
          daily_rate,
          status
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Created new vehicle:', vehicle);

      return NextResponse.json({
        success: true,
        data: vehicle,
        vehicle: vehicle
      });
    } catch (insertError) {
      console.error('Error creating vehicle (basic fields):', insertError);
      
      // If the first insert fails, try again with reduced fields as a fallback
      try {
        const { data: vehicle, error } = await supabase
          .from('vehicles')
          .insert({
            type,
            model,
            number_plate,
            daily_rate: parseFloat(daily_rate.toString())
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        console.log('Created new vehicle with fallback method:', vehicle);

        return NextResponse.json({
          success: true,
          data: vehicle,
          vehicle: vehicle
        });
      } catch (fallbackError) {
        console.error('Error creating vehicle (fallback attempt):', fallbackError);
        return NextResponse.json(
          { success: false, error: 'Failed to create vehicle after multiple attempts' },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Error in create vehicle endpoint:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getVehicles);
export const POST = withAuth(createVehicle);