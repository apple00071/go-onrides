import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { generateAuthToken, setAuthCookie, isDevelopment } from '@/lib/auth';
import { dbAdapter } from '@/lib/db-adapter';
import type { User } from '@/types';
import { dynamic, revalidate } from '../../config';

// Define the type for database users that includes password
interface DBUser extends Omit<User, 'permissions'> {
  password: string;
  permissions: string | string[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('Login attempt for email:', email);

    if (!email || !password) {
      console.log('Missing email or password');
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Use the DB adapter to get the user
    const user = await dbAdapter.getUserByEmail(email);

    console.log('Found user:', user ? { ...user, password: '[REDACTED]' } : 'User not found');

    if (!user) {
      console.log('User not found');
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Log the stored hash for debugging
    console.log('Stored password hash:', user.password);
    console.log('Input password:', password);

    // Use bcrypt.compare for secure comparison
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', isValidPassword);

    if (!isValidPassword) {
      console.log('Invalid password');
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.status !== 'active') {
      console.log('User account not active');
      return NextResponse.json(
        { success: false, message: 'Account is inactive. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Update last login time using the adapter
    await dbAdapter.updateUserLastLogin(user.id);

    // Handle permissions - ensure they're in array format
    const permissions = user.permissions ? 
      (Array.isArray(user.permissions) ? user.permissions : JSON.parse(user.permissions as string)) 
      : [];

    // Generate JWT token with permissions
    const token = await generateAuthToken({
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      status: user.status,
      permissions
    });

    console.log('Generated auth token');

    // Set auth cookie
    setAuthCookie(token);
    console.log('Set auth cookie');

    // Return user data (without password)
    const { password: _, ...userData } = user;

    // Create the response with the appropriate headers
    const response = NextResponse.json({
      success: true,
      role: user.role,
      data: {
        ...userData,
        permissions: permissions
      }
    });

    // Set CORS headers based on environment
    const origin = request.headers.get('origin') || '';
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Origin', isDevelopment() ? origin || '*' : origin);

    if (isDevelopment()) {
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    console.log('Login successful');
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': request.headers.get('origin') || 'http://localhost:3000',
    },
  });
} 