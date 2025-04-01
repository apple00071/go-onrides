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

    // Create vehicle record
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .insert({
        type,
        model,
        number_plate,
        daily_rate,
        status,
        manufacturer,
        year,
        color
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating vehicle:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to create vehicle' },
        { status: 500 }
      );
    }

    console.log('Created new vehicle:', vehicle);

    return NextResponse.json({
      success: true,
      data: vehicle,
      // For backwards compatibility
      vehicle: vehicle
    });
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