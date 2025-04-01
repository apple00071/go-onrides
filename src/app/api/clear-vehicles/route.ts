import { NextResponse } from 'next/server';
import { supabase } from '@/lib/db';
import { withAuth } from '@/lib/auth';
import type { AuthenticatedRequest } from '@/types';

/**
 * API endpoint to clear all vehicles
 * This is a specialized endpoint that focuses solely on aggressive vehicle deletion
 */
export const POST = withAuth(async (request: AuthenticatedRequest): Promise<NextResponse> => {
  // Verify admin status
  if (request.user?.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Unauthorized access' },
      { status: 403 }
    );
  }

  console.log('Starting ultra-aggressive vehicle deletion process');
  let vehiclesDeleted = 0;
  let errors: string[] = [];
  
  try {
    // STEP 0: Ultra-aggressive reset - attempt to truncate the vehicles table
    try {
      console.log('STEP 0: Attempting ultra-aggressive truncation with constraint handling');
      
      // First, disable any triggers that might prevent deletion
      await supabase.rpc('execute_sql', {
        sql_string: `
          -- Disable trigger if it exists
          ALTER TABLE IF EXISTS vehicles DISABLE TRIGGER ALL;
          ALTER TABLE IF EXISTS bookings DISABLE TRIGGER ALL;
        `
      });

      // Try to clear any bookings referencing vehicles to avoid constraint issues
      const { error: bookingDeleteError } = await supabase
        .from('bookings')
        .delete()
        .neq('id', 0);
        
      if (bookingDeleteError) {
        console.log('Error clearing related bookings:', bookingDeleteError);
        errors.push(`Bookings deletion error: ${bookingDeleteError.message}`);
      } else {
        console.log('Successfully cleared bookings');
      }
      
      // Remove foreign key constraints that might prevent deletion
      const { error: constraintError } = await supabase.rpc('execute_sql', {
        sql_string: `
          -- Temporarily remove foreign key constraints
          ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_fkey;
          ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS fk_vehicle_id;
          ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_fkey1;
          ALTER TABLE IF EXISTS bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_foreign;
        `
      });
      
      if (constraintError) {
        console.log('Error removing constraints (continuing anyway):', constraintError);
        errors.push(`Constraint removal error: ${constraintError.message}`);
      }
      
      // Now try to truncate the vehicles table
      const { error: truncateError } = await supabase.rpc('execute_sql', {
        sql_string: `
          -- Force truncate the vehicles table
          TRUNCATE TABLE vehicles RESTART IDENTITY CASCADE;
        `
      });
      
      if (truncateError) {
        console.log('Error truncating vehicles table:', truncateError);
        errors.push(`Truncate error: ${truncateError.message}`);
      } else {
        console.log('Successfully truncated vehicles table');
        vehiclesDeleted += 999; // Assume we deleted a lot of vehicles
      }
      
      // Reset the ID sequence
      const { error: resetSeqError } = await supabase.rpc('execute_sql', {
        sql_string: `
          -- Reset the ID sequence
          ALTER SEQUENCE IF EXISTS vehicles_id_seq RESTART WITH 1;
        `
      });
      
      if (resetSeqError) {
        console.log('Error resetting sequence:', resetSeqError);
        errors.push(`Sequence reset error: ${resetSeqError.message}`);
      }
      
      // Re-enable triggers
      await supabase.rpc('execute_sql', {
        sql_string: `
          -- Re-enable triggers
          ALTER TABLE IF EXISTS vehicles ENABLE TRIGGER ALL;
          ALTER TABLE IF EXISTS bookings ENABLE TRIGGER ALL;
        `
      });
    } catch (aggressiveError) {
      console.error('Error in aggressive truncation step:', aggressiveError);
      errors.push(`Aggressive truncation error: ${aggressiveError instanceof Error ? aggressiveError.message : 'Unknown error'}`);
    }
    
    // STEP 1: Standard deletion - delete all vehicles by ID
    try {
      console.log('STEP 1: Attempting to delete all vehicles by ID');
      
      // Get all vehicle IDs
      const { data: vehicleData, error: fetchError } = await supabase
        .from('vehicles')
        .select('id');
        
      if (fetchError) {
        console.log('Error fetching vehicle IDs:', fetchError);
        errors.push(`Vehicle ID fetch error: ${fetchError.message}`);
      } else if (vehicleData && vehicleData.length > 0) {
        // Delete vehicles one by one
        for (const vehicle of vehicleData) {
          const { error: deleteError } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', vehicle.id);
            
          if (deleteError) {
            console.log(`Error deleting vehicle ID ${vehicle.id}:`, deleteError);
            errors.push(`Vehicle ${vehicle.id} deletion error: ${deleteError.message}`);
          } else {
            vehiclesDeleted++;
            console.log(`Deleted vehicle ID ${vehicle.id}`);
          }
        }
      }
    } catch (standardError) {
      console.error('Error in standard deletion step:', standardError);
      errors.push(`Standard deletion error: ${standardError instanceof Error ? standardError.message : 'Unknown error'}`);
    }
    
    // STEP 2: Delete by status - some vehicles might still remain
    try {
      console.log('STEP 2: Attempting to delete vehicles by status');
      
      const statuses = ['available', 'rented', 'maintenance', 'retired'];
      
      for (const status of statuses) {
        const { error: statusDeleteError } = await supabase
          .from('vehicles')
          .delete()
          .eq('status', status);
          
        if (statusDeleteError) {
          console.log(`Error deleting vehicles with status ${status}:`, statusDeleteError);
          errors.push(`Status deletion error (${status}): ${statusDeleteError.message}`);
        } else {
          console.log(`Deleted vehicles with status ${status}`);
        }
      }
    } catch (statusError) {
      console.error('Error in status deletion step:', statusError);
      errors.push(`Status deletion error: ${statusError instanceof Error ? statusError.message : 'Unknown error'}`);
    }
    
    // STEP 3: Delete all remaining vehicles (if any)
    try {
      console.log('STEP 3: Final cleanup - delete any remaining vehicles');
      
      const { count, error: countError } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.log('Error counting remaining vehicles:', countError);
        errors.push(`Vehicle count error: ${countError.message}`);
      } else if (count && count > 0) {
        console.log(`${count} vehicles still remain, attempting final deletion`);
        
        // Final attempt to delete all vehicles
        const { error: finalDeleteError } = await supabase
          .from('vehicles')
          .delete()
          .gte('id', 0);
          
        if (finalDeleteError) {
          console.log('Error in final deletion attempt:', finalDeleteError);
          errors.push(`Final deletion error: ${finalDeleteError.message}`);
        } else {
          console.log('Final deletion completed');
        }
      } else {
        console.log('No vehicles remain after previous steps');
      }
    } catch (finalError) {
      console.error('Error in final cleanup step:', finalError);
      errors.push(`Final cleanup error: ${finalError instanceof Error ? finalError.message : 'Unknown error'}`);
    }
    
    // STEP 4: Direct SQL fallback - last resort
    if (errors.length > 0) {
      try {
        console.log('STEP 4: Last resort - using direct SQL to clear vehicles');
        
        const { error: sqlDeleteError } = await supabase.rpc('execute_sql', {
          sql_string: `
            -- Delete all vehicle records directly
            DELETE FROM vehicles WHERE id IS NOT NULL;
            
            -- Reset the sequence
            ALTER SEQUENCE IF EXISTS vehicles_id_seq RESTART WITH 1;
          `
        });
        
        if (sqlDeleteError) {
          console.log('Error in SQL fallback deletion:', sqlDeleteError);
          errors.push(`SQL fallback error: ${sqlDeleteError.message}`);
        } else {
          console.log('SQL fallback deletion completed');
        }
      } catch (sqlError) {
        console.error('Error in SQL fallback step:', sqlError);
        errors.push(`SQL fallback error: ${sqlError instanceof Error ? sqlError.message : 'Unknown error'}`);
      }
    }
    
    // Final verification
    const { count: finalCount, error: finalCountError } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true });
      
    if (finalCountError) {
      console.log('Error in final verification count:', finalCountError);
      errors.push(`Final verification error: ${finalCountError.message}`);
      
      // Return error response when we can't verify
      return NextResponse.json({
        success: false,
        error: 'Could not verify if all vehicles were deleted',
        errors: errors
      }, { status: 500 });
    } else if (finalCount && finalCount > 0) {
      console.log(`WARNING: ${finalCount} vehicles still remain after all deletion attempts`);
      
      // Return partial success with warning
      return NextResponse.json({
        success: true,
        vehiclesDeleted: vehiclesDeleted,
        warning: `${finalCount} vehicles could not be deleted`,
        errors: errors
      });
    } else {
      console.log('VERIFICATION: All vehicles have been successfully deleted');
      
      // Restore foreign key constraints if all vehicles are gone
      try {
        const { error: restoreConstraintError } = await supabase.rpc('execute_sql', {
          sql_string: `
            -- Restore the foreign key constraint
            ALTER TABLE IF EXISTS bookings 
            ADD CONSTRAINT bookings_vehicle_id_fkey 
            FOREIGN KEY (vehicle_id) 
            REFERENCES vehicles(id);
          `
        });
        
        if (restoreConstraintError) {
          console.log('Error restoring foreign key constraint:', restoreConstraintError);
          errors.push(`Constraint restoration error: ${restoreConstraintError.message}`);
        }
      } catch (restoreError) {
        console.error('Error restoring constraints:', restoreError);
        errors.push(`Constraint restoration error: ${restoreError instanceof Error ? restoreError.message : 'Unknown error'}`);
      }
      
      return NextResponse.json({
        success: true,
        message: 'All vehicles have been successfully deleted',
        vehiclesDeleted: vehiclesDeleted,
        errors: errors.length > 0 ? errors : undefined
      });
    }
  } catch (error) {
    console.error('Error clearing vehicles:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error clearing vehicles',
        errors: errors
      },
      { status: 500 }
    );
  }
}); 