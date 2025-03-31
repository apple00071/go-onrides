import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET() {
  try {
    console.log('Initializing missing dashboard tables...');
    const db = await getDB();

    // Create rentals table with correct schema
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
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled', 'overdue')),
        base_price REAL,
        additional_charges REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        total_amount REAL,
        amount REAL, -- Adding the missing amount column
        payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'partial', 'completed')),
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
    console.log('Rentals table initialized');

    // Create sample rental data
    await db.exec(`
      INSERT OR IGNORE INTO rentals (
        rental_id, customer_id, vehicle_id, worker_id, 
        start_date, end_date, status, base_price, 
        additional_charges, discount, total_amount, amount,
        payment_status, created_at
      ) VALUES 
        ('RNT001', 1, 1, 1, '2023-11-01', '2023-11-05', 'completed', 500, 50, 0, 550, 550, 'completed', '2023-11-01 10:00:00'),
        ('RNT002', 1, 2, 1, '2023-12-10', '2023-12-15', 'active', 750, 0, 75, 675, 675, 'partial', '2023-12-10 11:00:00'),
        ('RNT003', 2, 3, 2, '2023-12-20', '2023-12-25', 'active', 600, 100, 0, 700, 700, 'pending', '2023-12-20 09:30:00')
      ON CONFLICT(rental_id) DO NOTHING
    `);
    console.log('Sample rental data created');

    // Create payments table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rental_id INTEGER,
        amount REAL,
        method TEXT CHECK(method IN ('cash', 'card', 'upi', 'other')),
        status TEXT DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed', 'refunded')),
        transaction_id TEXT,
        received_by INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rental_id) REFERENCES rentals(id),
        FOREIGN KEY (received_by) REFERENCES users(id)
      )
    `);
    console.log('Payments table initialized');

    // Create maintenance table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER,
        service_type TEXT,
        service_date TEXT,
        cost REAL,
        performed_by INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id),
        FOREIGN KEY (performed_by) REFERENCES users(id)
      )
    `);
    console.log('Maintenance table initialized');

    // Create vehicles table if not exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('bike', 'car')),
        model TEXT NOT NULL,
        number_plate TEXT UNIQUE NOT NULL,
        manufacturer TEXT,
        year INTEGER,
        color TEXT,
        status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'rented', 'maintenance', 'retired')),
        hourly_rate REAL,
        daily_rate REAL NOT NULL,
        weekly_rate REAL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Vehicles table initialized');

    // Create sample vehicle data
    await db.exec(`
      INSERT OR IGNORE INTO vehicles (
        type, model, number_plate, status, daily_rate
      ) VALUES 
        ('bike', 'Hero Splendor', 'MH01AB1234', 'available', 200),
        ('car', 'Maruti Swift', 'MH02CD5678', 'rented', 1000),
        ('scooter', 'Honda Activa', 'MH03EF9012', 'available', 300)
      ON CONFLICT(number_plate) DO NOTHING
    `);
    console.log('Sample vehicle data created');

    // Create customers table if not exists
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
    console.log('Customers table initialized');

    // Create sample customer data
    await db.exec(`
      INSERT OR IGNORE INTO customers (
        first_name, last_name, email, phone, address, created_at
      ) VALUES 
        ('John', 'Doe', 'john@example.com', '9876543210', '123 Main St, Mumbai', '2023-10-01 14:30:00'),
        ('Jane', 'Smith', 'jane@example.com', '8765432109', '456 Park Ave, Delhi', '2023-11-15 09:45:00')
      ON CONFLICT(email) DO NOTHING
    `);
    console.log('Sample customer data created');

    // Create users table if not exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'worker')),
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        permissions TEXT NOT NULL DEFAULT '[]',
        phone TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_login_at TEXT
      )
    `);
    console.log('Users table initialized');

    // Print table schemas for verification
    const tables = await db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);

    interface TableInfo {
      name: string;
      type: string;
    }

    interface TableSchemas {
      [key: string]: string[];
    }

    const tableSchemas: TableSchemas = {};
    for (const table of tables) {
      const schema = await db.all(`PRAGMA table_info(${table.name})`);
      tableSchemas[table.name] = schema.map(col => `${col.name} (${col.type})`);
    }

    return NextResponse.json({
      success: true,
      message: 'Dashboard tables initialized successfully',
      tables: tables.map(t => t.name),
      schemas: tableSchemas
    });
    
  } catch (error) {
    console.error('Table initialization error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to initialize tables', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 