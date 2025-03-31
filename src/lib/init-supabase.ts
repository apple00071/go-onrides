import { supabase, TABLES } from './supabase';
import bcrypt from 'bcryptjs';

/**
 * Initialize the Supabase database with the necessary tables and initial data
 * This is meant to be run in development only
 */
export async function initializeSupabaseSchema(options = { force: false }) {
  try {
    console.log('Checking for existing admin user...');
    
    // Check if admin user exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from(TABLES.USERS)
      .select('id')
      .eq('email', 'goonriders6@gmail.com')
      .single();

    if (options.force) {
      console.log('Force option enabled, clearing existing data...');
      await supabase.from(TABLES.BOOKINGS).delete().neq('id', 0);
      await supabase.from(TABLES.VEHICLES).delete().neq('id', 0);
      await supabase.from(TABLES.CUSTOMERS).delete().neq('id', 0);
      await supabase.from(TABLES.USERS).delete().neq('id', 0);
    }

    console.log('Creating admin and worker users...');

    // Create admin and worker users
    const { error: usersError } = await supabase.from(TABLES.USERS).upsert([
      {
        email: 'goonriders6@gmail.com',
        username: 'admin',
        password: await bcrypt.hash('Goonriders123!', 12),
        full_name: 'Goonriders Admin',
        role: 'admin',
        status: 'active',
        permissions: ['*']
      },
      {
        email: 'applegraphicshyd@gmail.com',
        username: 'worker',
        password: await bcrypt.hash('123456789', 12),
        full_name: 'Goonriders Worker',
        role: 'worker',
        status: 'active',
        permissions: [
          'dashboard.stats',
          'bookings.view',
          'bookings.create',
          'bookings.update',
          'vehicles.view',
          'customers.view',
          'customers.create'
        ]
      }
    ], { onConflict: 'email' });

    if (usersError) {
      console.error('Error creating users:', usersError);
      throw usersError;
    }

    // Create sample vehicles
    console.log('Creating sample vehicles...');
    const { error: vehiclesError } = await supabase.from(TABLES.VEHICLES).upsert([
      {
        type: 'bike',
        model: 'Test Bike 1',
        number_plate: 'TEST001',
        status: 'available',
        daily_rate: 1000
      },
      {
        type: 'bike',
        model: 'Test Bike 2',
        number_plate: 'TEST002',
        status: 'available',
        daily_rate: 1200
      }
    ], { onConflict: 'number_plate' });

    if (vehiclesError) {
      console.error('Error creating sample vehicles:', vehiclesError);
      throw vehiclesError;
    }

    return { success: true };
  } catch (error) {
    console.error('Error initializing schema:', error);
    return { success: false, error };
  }
}

export default initializeSupabaseSchema; 