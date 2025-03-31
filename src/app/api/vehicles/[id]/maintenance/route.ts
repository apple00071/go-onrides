import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Get maintenance records for a vehicle
async function getMaintenanceRecords(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  const vehicleId = params.id;
  
  if (!vehicleId) {
    return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
  }
  
  try {
    const db = await getDB();
    
    // Check if vehicle exists
    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    
    // Get all maintenance records for this vehicle
    const maintenanceRecords = await db.all(`
      SELECT 
        m.*,
        u.full_name as performed_by_name
      FROM maintenance m
      LEFT JOIN users u ON m.performed_by = u.id
      WHERE m.vehicle_id = ?
      ORDER BY m.service_date DESC
    `, [vehicleId]);
    
    return NextResponse.json({
      vehicle_id: vehicleId,
      maintenance_records: maintenanceRecords
    });
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance records' },
      { status: 500 }
    );
  }
}

// Add a maintenance record
async function addMaintenanceRecord(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  // Admin or worker authorization required
  if (!request.user || (request.user.role !== 'admin' && request.user.role !== 'worker')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  
  const vehicleId = params.id;
  
  if (!vehicleId) {
    return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
  }
  
  try {
    const db = await getDB();
    
    // Check if vehicle exists
    const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', [vehicleId]);
    
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.service_type) {
      return NextResponse.json({ error: 'Service type is required' }, { status: 400 });
    }
    
    if (!body.service_date) {
      return NextResponse.json({ error: 'Service date is required' }, { status: 400 });
    }
    
    // Validate date format (basic check)
    if (!isValidDate(body.service_date)) {
      return NextResponse.json({ error: 'Invalid service date. Use YYYY-MM-DD format' }, { status: 400 });
    }
    
    // Insert the maintenance record
    const result = await db.run(`
      INSERT INTO maintenance (
        vehicle_id, 
        service_type, 
        service_date, 
        cost, 
        vendor, 
        invoice_number, 
        odometer_reading, 
        performed_by, 
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      vehicleId,
      body.service_type,
      body.service_date,
      body.cost || 0,
      body.vendor || null,
      body.invoice_number || null,
      body.odometer_reading || null,
      request.user.id,
      body.notes || null
    ]);
    
    // Update the vehicle's last_maintenance_date
    await db.run(`
      UPDATE vehicles 
      SET last_maintenance_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [body.service_date, vehicleId]);
    
    // If service type is 'maintenance complete', update vehicle status to 'available'
    if (body.service_type.toLowerCase().includes('complete') && vehicle.status === 'maintenance') {
      await db.run(`
        UPDATE vehicles 
        SET status = 'available', updated_at = datetime('now')
        WHERE id = ?
      `, [vehicleId]);
    }
    
    // Get the created record
    const maintenanceRecord = await db.get(`
      SELECT * FROM maintenance WHERE id = ?
    `, [result.lastID]);
    
    return NextResponse.json({
      message: 'Maintenance record added successfully',
      maintenance_record: maintenanceRecord
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to add maintenance record' },
      { status: 500 }
    );
  }
}

// Update a maintenance record
async function updateMaintenanceRecord(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  // Admin authorization required
  if (!request.user || request.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }
  
  const vehicleId = params.id;
  
  if (!vehicleId) {
    return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const maintenanceId = searchParams.get('maintenance_id');
    
    if (!maintenanceId) {
      return NextResponse.json({ error: 'Maintenance record ID is required' }, { status: 400 });
    }
    
    const db = await getDB();
    
    // Check if maintenance record exists and belongs to this vehicle
    const existingRecord = await db.get(`
      SELECT * FROM maintenance 
      WHERE id = ? AND vehicle_id = ?
    `, [maintenanceId, vehicleId]);
    
    if (!existingRecord) {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }
    
    // Get request body
    const body = await request.json();
    
    // Only allow specific fields to be updated
    const allowedFields = [
      'service_type', 
      'service_date', 
      'cost', 
      'vendor', 
      'invoice_number', 
      'odometer_reading', 
      'notes'
    ];
    
    const updates: Record<string, any> = {};
    let hasUpdates = false;
    
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
        hasUpdates = true;
      }
    }
    
    if (!hasUpdates) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    
    // Validate date format if provided
    if (updates.service_date && !isValidDate(updates.service_date)) {
      return NextResponse.json({ error: 'Invalid service date. Use YYYY-MM-DD format' }, { status: 400 });
    }
    
    // Build the SQL query
    const setClause = Object.keys(updates)
      .map(field => `${field} = ?`)
      .join(', ');
    
    const values = Object.values(updates);
    
    // Update the maintenance record
    await db.run(`
      UPDATE maintenance
      SET ${setClause}, updated_at = datetime('now')
      WHERE id = ? AND vehicle_id = ?
    `, [...values, maintenanceId, vehicleId]);
    
    // If service date was updated, potentially update the vehicle's last_maintenance_date
    if (updates.service_date) {
      // Get the latest maintenance date for this vehicle
      const latestRecord = await db.get(`
        SELECT service_date FROM maintenance
        WHERE vehicle_id = ?
        ORDER BY service_date DESC
        LIMIT 1
      `, [vehicleId]);
      
      if (latestRecord) {
        await db.run(`
          UPDATE vehicles 
          SET last_maintenance_date = ?, updated_at = datetime('now')
          WHERE id = ?
        `, [latestRecord.service_date, vehicleId]);
      }
    }
    
    // Get the updated record
    const updatedRecord = await db.get(`
      SELECT * FROM maintenance WHERE id = ?
    `, [maintenanceId]);
    
    return NextResponse.json({
      message: 'Maintenance record updated successfully',
      maintenance_record: updatedRecord
    });
  } catch (error) {
    console.error('Error updating maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance record' },
      { status: 500 }
    );
  }
}

// Delete a maintenance record
async function deleteMaintenanceRecord(request: AuthenticatedRequest, { params }: { params: { id: string } }) {
  // Admin authorization required
  if (!request.user || request.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }
  
  const vehicleId = params.id;
  
  if (!vehicleId) {
    return NextResponse.json({ error: 'Vehicle ID is required' }, { status: 400 });
  }
  
  try {
    const { searchParams } = new URL(request.url);
    const maintenanceId = searchParams.get('maintenance_id');
    
    if (!maintenanceId) {
      return NextResponse.json({ error: 'Maintenance record ID is required' }, { status: 400 });
    }
    
    const db = await getDB();
    
    // Check if maintenance record exists and belongs to this vehicle
    const existingRecord = await db.get(`
      SELECT * FROM maintenance 
      WHERE id = ? AND vehicle_id = ?
    `, [maintenanceId, vehicleId]);
    
    if (!existingRecord) {
      return NextResponse.json({ error: 'Maintenance record not found' }, { status: 404 });
    }
    
    // Delete the maintenance record
    await db.run(`
      DELETE FROM maintenance
      WHERE id = ? AND vehicle_id = ?
    `, [maintenanceId, vehicleId]);
    
    // Update the vehicle's last_maintenance_date to the latest remaining record
    const latestRecord = await db.get(`
      SELECT service_date FROM maintenance
      WHERE vehicle_id = ?
      ORDER BY service_date DESC
      LIMIT 1
    `, [vehicleId]);
    
    if (latestRecord) {
      await db.run(`
        UPDATE vehicles 
        SET last_maintenance_date = ?, updated_at = datetime('now')
        WHERE id = ?
      `, [latestRecord.service_date, vehicleId]);
    } else {
      // No maintenance records left, set to null
      await db.run(`
        UPDATE vehicles 
        SET last_maintenance_date = NULL, updated_at = datetime('now')
        WHERE id = ?
      `, [vehicleId]);
    }
    
    return NextResponse.json({
      message: 'Maintenance record deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    return NextResponse.json(
      { error: 'Failed to delete maintenance record' },
      { status: 500 }
    );
  }
}

// Helper function to validate date format (YYYY-MM-DD)
function isValidDate(dateString: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

export const GET = withAuth(getMaintenanceRecords);
export const POST = withAuth(addMaintenanceRecord);
export const PATCH = withAuth(updateMaintenanceRecord);
export const DELETE = withAuth(deleteMaintenanceRecord); 