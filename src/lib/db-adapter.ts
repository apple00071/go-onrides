import { supabase } from './db';
import type { User } from '@/types';

interface DBUser extends Omit<User, 'permissions'> {
  password: string;
  permissions: string | string[];
}

class DBAdapter {
  async getUserByEmail(email: string): Promise<DBUser | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        return null;
      }

      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async updateUserLastLogin(userId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating user last login:', error);
    }
  }

  async getCustomers() {
    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return customers;
    } catch (error) {
      console.error('Error getting customers:', error);
      return [];
    }
  }

  async getVehicles() {
    try {
      const { data: vehicles, error } = await supabase
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return vehicles;
    } catch (error) {
      console.error('Error getting vehicles:', error);
      return [];
    }
  }

  async getBookings() {
    try {
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:customers(first_name, last_name),
          vehicle:vehicles(model, number_plate)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return bookings;
    } catch (error) {
      console.error('Error getting bookings:', error);
      return [];
    }
  }

  async getBookingStats() {
    try {
      // Get total bookings
      const { count: totalBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Get active bookings
      const { count: activeBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get total revenue
      const { data: payments } = await supabase
        .from('payments')
        .select('amount');

      const totalRevenue = payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;

      // Get pending payments
      const { count: pendingPayments } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Get available vehicles
      const { count: availableVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'available');

      // Get maintenance vehicles
      const { count: maintenanceVehicles } = await supabase
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'maintenance');

      // Get total customers
      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true });

      // Get overdue bookings
      const today = new Date().toISOString();
      const { count: overdueBookings } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lt('end_date', today);

      return {
        totalBookings: totalBookings || 0,
        activeBookings: activeBookings || 0,
        totalRevenue,
        pendingPayments: pendingPayments || 0,
        availableVehicles: availableVehicles || 0,
        maintenanceVehicles: maintenanceVehicles || 0,
        totalCustomers: totalCustomers || 0,
        overdueBookings: overdueBookings || 0
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      return {
        totalBookings: 0,
        activeBookings: 0,
        totalRevenue: 0,
        pendingPayments: 0,
        availableVehicles: 0,
        maintenanceVehicles: 0,
        totalCustomers: 0,
        overdueBookings: 0
      };
    }
  }
}

export const dbAdapter = new DBAdapter(); 