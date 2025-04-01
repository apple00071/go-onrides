import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '../config';

async function getBookings(request: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('bookings')
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
        booking_id.ilike.%${search}%
      `);
    }

    // Apply pagination
    const { data: bookings, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        bookings: bookings?.map(booking => ({
          id: booking.id,
          booking_id: booking.booking_id,
          customer_name: `${booking.customer.first_name} ${booking.customer.last_name}`,
          customer_phone: booking.customer.phone,
          vehicle: `${booking.vehicle.model} (${booking.vehicle.number_plate})`,
          worker_name: booking.worker.full_name,
          start_date: booking.start_date,
          end_date: booking.end_date,
          status: booking.status,
          total_amount: booking.total_amount,
          payment_status: booking.payment_status,
          created_at: booking.created_at
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
    console.error('Error in bookings endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function createBooking(request: AuthenticatedRequest) {
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

    // Generate booking ID
    const bookingId = `BKG${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Create booking record
    const { data: booking, error } = await supabase
      .from('bookings')
      .insert({
        booking_id: bookingId,
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
      console.error('Error creating booking:', error);
      return NextResponse.json(
        { error: 'Failed to create booking' },
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
      data: booking
    });
  } catch (error) {
    console.error('Error in create booking endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getBookings);
export const POST = withAuth(createBooking); 