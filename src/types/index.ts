import { NextRequest } from 'next/server';

export type Permission = 
  | 'dashboard.stats'
  | 'bookings.view'
  | 'bookings.create'
  | 'bookings.update'
  | 'bookings.delete'
  | 'bookings.return'
  | 'vehicles.view'
  | 'vehicles.create'
  | 'vehicles.update'
  | 'vehicles.delete'
  | 'customers.view'
  | 'customers.create'
  | 'customers.update'
  | 'customers.delete'
  | 'settings.view'
  | 'settings.update'
  | '*';

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: 'admin' | 'worker';
  status: 'active' | 'inactive';
  phone?: string;
  created_at: string;
  last_login_at?: string;
  permissions: Permission[];
}

export interface AuthenticatedRequest extends NextRequest {
  user?: User;
  params?: {
    [key: string]: string;
  };
}

export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  father_phone?: string;
  mother_phone?: string;
  emergency_contact1?: string;
  emergency_contact2?: string;
  id_type?: string;
  id_number?: string;
  driver_license?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Vehicle {
  id: number;
  type: 'bike';
  model: string;
  number_plate: string;
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  daily_rate: number;
  created_at: string;
  updated_at?: string;
}

export interface Booking {
  id: number;
  booking_id: string;
  customer_id: number;
  vehicle_id: number;
  worker_id: number;
  start_date: string;
  end_date: string;
  return_date?: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  base_price: number;
  total_amount: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  booking_id: string;
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'other';
  reference_number?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  received_by: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface Maintenance {
  id: number;
  vehicle_id: number;
  service_type: string;
  service_date: string;
  cost: number;
  performed_by: number;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

export interface Setting {
  id: number;
  category: string;
  key: string;
  value: string;
  type: string;
  label?: string;
  description?: string;
  options?: string;
  updatedAt: string;
  updatedBy?: number;
}

// These interfaces match our database column names
export interface DBUser {
  id: number;
  username: string;
  role: 'admin' | 'worker';
  full_name: string;
  email: string;
  phone?: string;
  status: 'active' | 'inactive';
  created_at: string;
  last_login_at?: string;
}

export interface DBVehicle {
  id: number;
  type: 'bike' | 'car';
  model: string;
  serial_number: string;
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  condition?: string;
  last_maintenance_date?: string;
  added_at: string;
  notes?: string;
}

export interface DBCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  father_phone?: string;
  mother_phone?: string;
  emergency_contact1?: string;
  emergency_contact2?: string;
  address: string;
  id_type?: string;
  id_number?: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
}

export interface DBBooking {
  id: number;
  booking_id: string;
  customer_id: number;
  vehicle_id: number;
  worker_id: number;
  start_date: string;
  end_date: string;
  return_date?: string;
  status: string;
  base_price: number;
  total_amount: number;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export interface UserDetails {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  created_at: string;
  stats: {
    totalActions: number;
    lastActive: string;
    loginCount: number;
  };
  recentActivity: {
    id: string;
    action: string;
    details: string;
    timestamp: string;
  }[];
}

export interface CustomerDetails {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  created_at: string;
  stats: {
    totalBookings: number;
    activeBookings: number;
    completedBookings: number;
    totalSpent: number;
  };
  bookings: {
    id: string;
    booking_id: string;
    vehicle: string;
    start_date: string;
    end_date: string;
    status: string;
    amount: number;
  }[];
} 