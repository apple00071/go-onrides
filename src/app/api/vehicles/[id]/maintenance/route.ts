import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';
import { dynamic, revalidate } from '@/app/api/config';

// Get maintenance records for a vehicle
async function getMaintenanceRecords(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: records, error } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        performed_by:users(full_name)
      `)
      .eq('vehicle_id', params.id)
      .order('service_date', { ascending: false });

    if (error) {
      console.error('Error fetching maintenance records:', error);
      return NextResponse.json(
        { error: 'Failed to fetch maintenance records' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      records: records || []
    });
  } catch (error) {
    console.error('Error in get maintenance records:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add a new maintenance record
async function addMaintenanceRecord(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { service_type, service_date, cost, notes } = body;

    if (!service_type || !service_date || !cost) {
      return NextResponse.json(
        { error: 'Service type, date, and cost are required' },
        { status: 400 }
      );
    }

    if (!isValidDate(service_date)) {
      return NextResponse.json(
        { error: 'Invalid service date format' },
        { status: 400 }
      );
    }

    // Create maintenance record
    const { data: record, error } = await supabase
      .from('maintenance_records')
      .insert({
        vehicle_id: params.id,
        service_type,
        service_date,
        cost,
        notes,
        performed_by: request.user?.id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating maintenance record:', error);
      return NextResponse.json(
        { error: 'Failed to create maintenance record' },
        { status: 500 }
      );
    }

    // Update vehicle status to maintenance
    const { error: updateError } = await supabase
      .from('vehicles')
      .update({ 
        status: 'maintenance',
        last_maintenance_date: service_date
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating vehicle status:', updateError);
      // Don't fail the request if vehicle update fails
    }

    return NextResponse.json({
      success: true,
      record
    });
  } catch (error) {
    console.error('Error in add maintenance record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update a maintenance record
async function updateMaintenanceRecord(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { recordId, service_type, service_date, cost, notes, status } = body;

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    if (service_date && !isValidDate(service_date)) {
      return NextResponse.json(
        { error: 'Invalid service date format' },
        { status: 400 }
      );
    }

    // Update maintenance record
    const { data: record, error } = await supabase
      .from('maintenance_records')
      .update({
        service_type,
        service_date,
        cost,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .eq('vehicle_id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating maintenance record:', error);
      return NextResponse.json(
        { error: 'Failed to update maintenance record' },
        { status: 500 }
      );
    }

    // If status is provided, update vehicle status
    if (status) {
      const { error: updateError } = await supabase
        .from('vehicles')
        .update({ 
          status,
          last_maintenance_date: service_date || record.service_date
        })
        .eq('id', params.id);

      if (updateError) {
        console.error('Error updating vehicle status:', updateError);
        // Don't fail the request if vehicle update fails
      }
    }

    return NextResponse.json({
      success: true,
      record
    });
  } catch (error) {
    console.error('Error in update maintenance record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete a maintenance record
async function deleteMaintenanceRecord(
  request: AuthenticatedRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('recordId');

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    // Delete maintenance record
    const { error } = await supabase
      .from('maintenance_records')
      .delete()
      .eq('id', recordId)
      .eq('vehicle_id', params.id);

    if (error) {
      console.error('Error deleting maintenance record:', error);
      return NextResponse.json(
        { error: 'Failed to delete maintenance record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Maintenance record deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete maintenance record:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export const GET = withAuth(getMaintenanceRecords);
export const POST = withAuth(addMaintenanceRecord);
export const PATCH = withAuth(updateMaintenanceRecord);
export const DELETE = withAuth(deleteMaintenanceRecord); 