import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../config';

async function getRentals(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('rentals')
      .select(`
        *,
        customer:customers(first_name, last_name, phone),
        vehicle:vehicles(model, number_plate),
        worker:users(full_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`
        customer.first_name.ilike.%${search}%,
        customer.last_name.ilike.%${search}%,
        customer.phone.ilike.%${search}%,
        vehicle.model.ilike.%${search}%,
        vehicle.number_plate.ilike.%${search}%,
        rental_id.ilike.%${search}%
      `);
    }

    // Apply pagination
    const { data: rentals, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching rentals:', error);
      return NextResponse.json(
        { error: 'Failed to fetch rentals' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        rentals: rentals?.map(rental => ({
          id: rental.id,
          rental_id: rental.rental_id,
          customer_name: `${rental.customer.first_name} ${rental.customer.last_name}`,
          customer_phone: rental.customer.phone,
          vehicle: `${rental.vehicle.model} (${rental.vehicle.number_plate})`,
          worker_name: rental.worker.full_name,
          start_date: rental.start_date,
          end_date: rental.end_date,
          status: rental.status,
          total_amount: rental.total_amount,
          payment_status: rental.payment_status,
          created_at: rental.created_at
        })) || [],
        pagination: {
          total: count || 0,
          page,
          limit,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error in rentals endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createRental(request: AuthenticatedRequest) {
  try {
    const body = await request.json();
    const {
      customer_id,
      vehicle_id,
      start_date,
      end_date,
      total_amount,
      document_path,
      signature_path,
      customer_photo_path,
      notes
    } = body;

    if (!customer_id || !vehicle_id || !start_date || !end_date || !total_amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate rental ID
    const rentalId = `RNT${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create rental record
    const { data: rental, error } = await supabase
      .from('rentals')
      .insert({
        rental_id: rentalId,
        customer_id,
        vehicle_id,
        worker_id: request.user?.id,
        start_date,
        end_date,
        status: 'active',
        total_amount,
        payment_status: 'pending',
        document_path,
        signature_path,
        customer_photo_path,
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating rental:', error);
      return NextResponse.json(
        { error: 'Failed to create rental' },
        { status: 500 }
      );
    }

    // Update vehicle status
    await supabase
      .from('vehicles')
      .update({
        status: 'rented',
        updated_at: new Date().toISOString()
      })
      .eq('id', vehicle_id);

    return NextResponse.json({
      success: true,
      data: rental
    });
  } catch (error) {
    console.error('Error in create rental endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getRentals);
export const POST = withAuth(createRental); 