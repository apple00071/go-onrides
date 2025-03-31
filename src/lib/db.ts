import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import bcrypt from 'bcryptjs';
import { promises as fs } from 'fs';

let db: Database | null = null;

/**
 * Get a database connection. If one doesn't exist, create it.
 */
export async function getDB(): Promise<Database> {
  if (db) return db;

  console.log('Initializing database connection...');
  
  try {
    const dbPath = path.join(process.cwd(), 'rental_records.db');
    console.log(`Opening database at: ${dbPath}`);
    
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('Database connection established');
    
    // Create required tables
    await createTables(db);
    
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Create database tables if they don't exist
 */
async function createTables(db: Database): Promise<void> {
  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      full_name TEXT,
      phone TEXT,
      role TEXT CHECK(role IN ('admin', 'worker')),
      status TEXT DEFAULT 'active',
      permissions TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_login_at TEXT,
      updated_at TEXT
    )
  `);
  console.log('Users table created/verified');

  // Add default admin user if no users exist
  const existingUsers = await db.get('SELECT COUNT(*) as count FROM users');
  if (existingUsers.count === 0) {
    console.log('Adding default admin user...');
    const hashedPassword = await bcrypt.hash('Goonriders123!', 12);
    await db.run(`
      INSERT INTO users (
        username, 
        email, 
        password, 
        full_name, 
        role, 
        status, 
        permissions, 
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      'admin',
      'goonriders6@gmail.com',
      hashedPassword,
      'Goonriders Admin',
      'admin',
      'active',
      JSON.stringify(['*']) // Admin has all permissions
    ]);
    console.log('Default admin user created successfully');
  }

  // Vehicles table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT CHECK(type IN ('bike')),
      model TEXT NOT NULL,
      number_plate TEXT UNIQUE NOT NULL,
      status TEXT CHECK(status IN ('available', 'rented', 'maintenance', 'retired')),
      daily_rate REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT
    )
  `);
  console.log('Vehicles table created/verified');

  // Customers table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      father_phone TEXT,
      mother_phone TEXT,
      emergency_contact1 TEXT,
      emergency_contact2 TEXT,
      address TEXT,
      id_type TEXT,
      id_number TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      notes TEXT
    )
  `);
  console.log('Customers table created/verified');

  // Rentals table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id TEXT UNIQUE,
      customer_id INTEGER,
      vehicle_id INTEGER,
      worker_id INTEGER,
      start_date TEXT,
      end_date TEXT,
      actual_return_date TEXT,
      status TEXT CHECK(status IN ('active', 'completed', 'cancelled', 'overdue')),
      base_price REAL,
      additional_charges REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_amount REAL,
      amount REAL,
      payment_status TEXT CHECK(payment_status IN ('pending', 'partial', 'completed', 'paid')),
      payment_method TEXT,
      document_path TEXT,
      signature_path TEXT,
      customer_photo_path TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
      FOREIGN KEY (worker_id) REFERENCES users(id)
    )
  `);
  console.log('Rentals table created/verified');

  // Payments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rental_id INTEGER,
      amount REAL,
      method TEXT CHECK(method IN ('cash', 'card', 'bank_transfer', 'upi', 'other')),
      status TEXT CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
      transaction_id TEXT,
      received_by INTEGER,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (rental_id) REFERENCES rentals(id),
      FOREIGN KEY (received_by) REFERENCES users(id)
    )
  `);
  console.log('Payments table created/verified');

  // Maintenance table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vehicle_id INTEGER,
      service_type TEXT,
      service_date TEXT,
      next_service_date TEXT,
      cost REAL,
      performed_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    )
  `);
  console.log('Maintenance table created/verified');

  // Settings table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      key TEXT UNIQUE,
      value TEXT,
      type TEXT,
      label TEXT,
      description TEXT,
      options TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    )
  `);
  console.log('Settings table created/verified');
}

/**
 * Execute a transaction with the provided callback
 */
export async function executeTransaction<T>(
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const database = await getDB();
  
  try {
    await database.exec('BEGIN TRANSACTION');
    const result = await callback(database);
    await database.exec('COMMIT');
    return result;
  } catch (error) {
    await database.exec('ROLLBACK');
    throw error;
  }
}

/**
 * Run a SQL query with parameters
 */
export async function runSqlQuery(query: string, params: any[] = []): Promise<any> {
  const database = await getDB();
  
  try {
    if (query.trim().toLowerCase().startsWith('select')) {
      return await database.all(query, params);
    } else {
      return await database.run(query, params);
    }
  } catch (error) {
    console.error('SQL query error:', error);
    throw error;
  }
}

/**
 * Build a WHERE clause from a filters object
 */
export function buildWhereClause(filters: Record<string, any>, startWithWhere = true): string {
  const conditions = [];
  
  for (const key in filters) {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      if (typeof filters[key] === 'string' && filters[key].includes('%')) {
        conditions.push(`${key} LIKE ?`);
      } else {
        conditions.push(`${key} = ?`);
      }
    }
  }
  
  if (conditions.length === 0) {
    return '';
  }
  
  return `${startWithWhere ? 'WHERE' : 'AND'} ${conditions.join(' AND ')}`;
}

/**
 * Extract parameters from a filters object
 */
export function getFilterParams(filters: Record<string, any>): any[] {
  const params = [];
  
  for (const key in filters) {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      params.push(filters[key]);
    }
  }
  
  return params;
}

/**
 * Build an ORDER BY clause
 */
export function buildOrderClause(sortField?: string, sortOrder: 'asc' | 'desc' = 'asc'): string {
  if (!sortField) {
    return '';
  }
  
  return `ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;
}

/**
 * Build a LIMIT and OFFSET clause for pagination
 */
export function buildLimitOffsetClause(page: number = 1, limit: number = 10): string {
  const offset = (page - 1) * limit;
  return `LIMIT ${limit} OFFSET ${offset}`;
} 