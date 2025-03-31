import { supabase, TABLES, isDevelopment } from './supabase';
import { getDB } from './db'; // The existing SQLite adapter
import { User, Customer, Vehicle, Booking, Payment } from '@/types';
import { PostgrestError } from '@supabase/supabase-js';

// Define a type for database users that includes password
interface DBUser extends Omit<User, 'permissions'> {
  password: string;
  permissions: string | string[];
}

/**
 * Database adapter that switches between Supabase (dev) and SQLite/MySQL (prod)
 * Provides a consistent interface regardless of which database is being used
 */
class DBAdapter {
  // User-related operations
  async getUserByEmail(email: string): Promise<DBUser | null> {
    try {
      const db = await getDB();
      const user = await db.get(
        `SELECT id, email, password, full_name, username, role, status, permissions, created_at, last_login_at
         FROM users 
         WHERE email = ?`,
        [email]
      );

      if (!user) {
        return null;
      }

      // Ensure permissions is properly parsed
      if (user.permissions && typeof user.permissions === 'string') {
        try {
          user.permissions = JSON.parse(user.permissions);
        } catch (err) {
          console.error('Error parsing permissions:', err);
          user.permissions = [];
        }
      } else if (!user.permissions) {
        user.permissions = [];
      }

      return user as DBUser;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw error;
    }
  }

  // User authentication
  async updateUserLastLogin(userId: number): Promise<void> {
    try {
      const db = await getDB();
      await db.run(
        'UPDATE users SET last_login_at = datetime("now") WHERE id = ?',
        [userId]
      );
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  // Customers operations
  async getCustomers() {
    if (isDevelopment()) {
      const { data, error } = await supabase
        .from(TABLES.CUSTOMERS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error.message);
        return [];
      }
      return data;
    } else {
      // Production: use SQLite/MySQL
      const db = await getDB();
      return db.all('SELECT * FROM customers ORDER BY created_at DESC');
    }
  }

  // Vehicles operations
  async getVehicles() {
    if (isDevelopment()) {
      const { data, error } = await supabase
        .from(TABLES.VEHICLES)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicles:', error.message);
        return [];
      }
      return data;
    } else {
      // Production: use SQLite/MySQL
      const db = await getDB();
      return db.all('SELECT * FROM vehicles ORDER BY created_at DESC');
    }
  }

  // Bookings operations
  async getBookings() {
    try {
      const { data, error } = await supabase
        .from(TABLES.BOOKINGS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        console.error('Error fetching bookings:', error.message);
      } else {
        console.error('Unknown error fetching bookings:', error);
      }
      throw error;
    }
  }

  async getBookingStats() {
    try {
      const { data, error } = await supabase
        .from(TABLES.BOOKINGS)
        .select(`
          id,
          booking_id,
          start_date,
          end_date,
          status,
          base_price,
          total_amount,
          created_at,
          customers:customer_id (
            first_name,
            last_name
          ),
          vehicles:vehicle_id (
            model,
            number_plate
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      if (error instanceof PostgrestError) {
        console.error('Error fetching booking stats:', error.message);
      } else {
        console.error('Unknown error fetching booking stats:', error);
      }
      throw error;
    }
  }

  // Generic transaction handling
  async transaction<T>(callback: (trx: any) => Promise<T>): Promise<T> {
    if (isDevelopment()) {
      // Supabase doesn't have native transactions in the client,
      // but we can simulate the behavior for consistency
      try {
        return await callback(supabase);
      } catch (error) {
        console.error('Transaction error:', error);
        throw error;
      }
    } else {
      // Production: use SQLite/MySQL
      const db = await getDB();
      try {
        await db.run('BEGIN TRANSACTION');
        const result = await callback(db);
        await db.run('COMMIT');
        return result;
      } catch (error) {
        await db.run('ROLLBACK');
        console.error('Transaction error:', error);
        throw error;
      }
    }
  }
}

// Export a singleton instance
export const dbAdapter = new DBAdapter(); 