import express, { Request, Response, NextFunction } from 'express';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import multer from 'multer';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

interface CustomRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
  cookies: {
    adminToken?: string;
  };
}

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: ['https://admin.go-onriders.com', 'https://worker.go-onriders.com'],
  credentials: true
}));

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Database initialization
async function initializeDB() {
  const db = await open({
    filename: path.join(__dirname, 'rental_records.db'),
    driver: sqlite3.Database
  });

  // Create rentals table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS rentals (
      rentalId TEXT PRIMARY KEY,
      firstName TEXT,
      lastName TEXT,
      email TEXT,
      phone TEXT,
      fatherPhone TEXT,
      motherPhone TEXT,
      emergencyContact1 TEXT,
      emergencyContact2 TEXT,
      address TEXT,
      startDate TEXT,
      endDate TEXT,
      documentPath TEXT,
      signaturePath TEXT,
      customerPhotoPath TEXT,
      status TEXT DEFAULT 'active',
      returnDate TEXT,
      remarks TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create admin users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default admin if not exists
  const defaultAdmin = await db.get('SELECT * FROM admin_users WHERE username = ?', ['admin']);
  if (!defaultAdmin) {
    const hashedPassword = await bcrypt.hash('Goonriders123!', 12);
    await db.run(
      'INSERT INTO admin_users (username, password) VALUES (?, ?)',
      ['admin', hashedPassword]
    );
  }

  return db;
}

// Middleware to verify JWT token
const authenticateToken = async (req: CustomRequest, res: Response, next: NextFunction) => {
  const token = req.cookies.adminToken;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Admin login route
app.post('/api/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const db = await initializeDB();

    const admin = await db.get('SELECT * FROM admin_users WHERE username = ?', [username]);
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: admin.id, username: admin.username }, JWT_SECRET, {
      expiresIn: '24h'
    });

    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({ message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Admin logout route
app.post('/api/admin/logout', (req: Request, res: Response) => {
  res.clearCookie('adminToken');
  res.json({ message: 'Logged out successfully' });
});

// Protected routes
app.get('/api/rentals', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = await initializeDB();
    const rentals = await db.all('SELECT * FROM rentals ORDER BY createdAt DESC');
    res.json(rentals);
  } catch (error) {
    console.error('Error fetching rentals:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.patch('/api/rentals/:id/return', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const db = await initializeDB();

    await db.run(
      'UPDATE rentals SET status = ?, returnDate = ?, remarks = ? WHERE rentalId = ?',
      ['returned', new Date().toISOString(), remarks, id]
    );

    res.json({ message: 'Rental updated successfully' });
  } catch (error) {
    console.error('Error updating rental:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Local server running on port ${port}`);
}); 