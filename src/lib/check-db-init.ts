import { supabase, TABLES } from './supabase';
import { initializeSupabaseSchema } from './init-supabase';

/**
 * Function to check if the database is initialized
 * and optionally initialize it if AUTO_INIT_DB is true
 */
export async function checkDatabaseInitialization() {
  // Only check in development mode
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  console.log('Checking database initialization status...');
  
  try {
    // Check if users table exists
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('count', { count: 'exact' })
      .limit(1);
    
    // If an error occurs or no users exist, we might need initialization
    const needsInit = error || (data && data.length === 0);
    
    if (needsInit) {
      console.log('Database may need initialization');
      
      // Check if auto-init is enabled
      const autoInit = process.env.AUTO_INIT_DB === 'true';
      
      if (autoInit) {
        console.log('AUTO_INIT_DB is true, initializing database...');
        await initializeSupabaseSchema();
        console.log('Database auto-initialization complete');
      } else {
        console.log('AUTO_INIT_DB is not enabled. To initialize, visit /api/init-db');
        console.log('For sample data, use /api/init-db?force=true');
      }
    } else {
      console.log('Database is already initialized');
    }
  } catch (error) {
    console.error('Error checking database initialization:', error);
  }
} 