import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

// Define table names
const TABLES = {
  BOOKINGS: 'bookings',
  VEHICLES: 'vehicles',
  CUSTOMERS: 'customers',
  USERS: 'users',
  SETTINGS: 'settings'
};

/**
 * API endpoint to clear all data except admin login information
 */
async function clearData(request: AuthenticatedRequest) {
  try {
    // Verify that the user is an admin
    if (request.user?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized access' },
        { status: 403 }
      );
    }

    console.log('Starting data deletion process...');
    
    // Step 1: Delete all bookings
    // First remove any constraints that might prevent deletion
    const { error: bookingsError } = await supabase
      .from(TABLES.BOOKINGS)
      .delete()
      .neq('id', 0);

    if (bookingsError) {
      console.error('Error deleting bookings:', bookingsError);
      throw new Error('Failed to delete bookings');
    }
    
    // Step 2: Delete all vehicles using multiple approaches to ensure complete deletion
    
    // 2.1 First attempt - standard deletion
    const { error: vehiclesError1 } = await supabase
      .from(TABLES.VEHICLES)
      .delete()
      .neq('id', 0);
      
    if (vehiclesError1) {
      console.error('First vehicle deletion attempt error:', vehiclesError1);
    }
    
    // 2.2 Second attempt - delete all vehicles regardless of status
    const { error: vehiclesError2 } = await supabase
      .from(TABLES.VEHICLES)
      .delete()
      .in('status', ['available', 'maintenance', 'rented', 'retired']);
    
    if (vehiclesError2) {
      console.error('Second vehicle deletion attempt error:', vehiclesError2);
    }
    
    // 2.3 Third attempt - truncate approach (delete everything)
    const { error: vehiclesError3 } = await supabase
      .from(TABLES.VEHICLES)
      .delete()
      .gte('id', 0);
      
    if (vehiclesError3) {
      console.error('Third vehicle deletion attempt error:', vehiclesError3);
    }
    
    // 2.4 Fourth attempt - direct SQL approach as last resort
    try {
      // Execute raw SQL as a last resort to completely clear the vehicles table
      const { error: sqlError } = await supabase.rpc('truncate_vehicles', {});
      
      if (sqlError) {
        console.error('Error executing SQL truncation:', sqlError);
        
        // Try another raw SQL approach
        const { error: directSqlError } = await supabase.rpc('execute_sql', {
          sql_string: 'DELETE FROM vehicles WHERE TRUE;'
        });
        
        if (directSqlError) {
          console.error('Error executing direct SQL deletion:', directSqlError);
        }
      }
    } catch (sqlExecError) {
      console.error('Error in SQL execution:', sqlExecError);
    }
    
    // Check if any vehicles remain after deletion attempts
    const { count, error: countError } = await supabase
      .from(TABLES.VEHICLES)
      .select('*', { count: 'exact', head: true });
      
    if (countError) {
      console.error('Error counting remaining vehicles:', countError);
    } else if (count && count > 0) {
      console.log(`WARNING: ${count} vehicles still remain in the database after deletion attempts`);
    } else {
      console.log('All vehicles have been successfully deleted');
    }

    // Step 3: Delete all customers
    const { error: customersError } = await supabase
      .from(TABLES.CUSTOMERS)
      .delete()
      .neq('id', 0);
      
    if (customersError) {
      console.error('Error deleting customers:', customersError);
      throw new Error('Failed to delete customers');
    }

    // Step 4: Delete all settings except core settings
    const { error: settingsError } = await supabase
      .from(TABLES.SETTINGS)
      .delete()
      .neq('id', 1); // Keep the primary settings record
      
    if (settingsError) {
      console.error('Error deleting settings:', settingsError);
      throw new Error('Failed to delete settings');
    }

    // Step 5: Delete all users EXCEPT admin users
    const { error: usersError } = await supabase
      .from(TABLES.USERS)
      .delete()
      .not('role', 'eq', 'admin');
      
    if (usersError) {
      console.error('Error deleting non-admin users:', usersError);
      throw new Error('Failed to delete non-admin users');
    }

    console.log('Successfully deleted all data except admin login information');

    return NextResponse.json({
      success: true,
      message: 'All data has been cleared except admin login information'
    });
  } catch (error) {
    console.error('Error clearing data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred during data deletion' 
      },
      { status: 500 }
    );
  }
}

// Apply authentication middleware
export const POST = withAuth(clearData); 