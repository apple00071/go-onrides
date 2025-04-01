import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '@/lib/db';
import { dynamic } from '../../../api/config';

// Set the environment for server-side rendering
export const runtime = 'nodejs';
export { dynamic };

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username/email and password are required' },
        { status: 400 }
      );
    }

    // For demo purposes, let's allow a default user
    // In production, you should only use credentials from the database
    if (username === 'demo' && password === 'demo123') {
      const token = jwt.sign(
        { 
          id: 999,
          username: 'demo', 
          email: 'demo@example.com',
          role: 'worker',
          status: 'active'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set the token in a HTTP-only cookie
      cookies().set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/'
      });

      // Also set the user in localStorage via a normal object
      const userData = {
        id: 999,
        username: 'demo',
        role: 'worker'
      };

      return NextResponse.json({ 
        message: 'Login successful',
        user: userData
      });
    }

    // Support for legacy credentials (hardcoded for this specific case)
    if (username === 'goonriders6@gmail.com' && password === 'Goonriders123!') {
      const token = jwt.sign(
        { 
          id: 1001,
          username: 'goonriders', 
          email: 'goonriders6@gmail.com',
          role: 'admin',
          status: 'active'
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set the token in a HTTP-only cookie
      cookies().set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/'
      });

      // Return user data that will be stored in localStorage
      const userData = {
        id: 1001,
        username: 'goonriders',
        role: 'admin'
      };

      return NextResponse.json({ 
        message: 'Login successful',
        user: userData
      });
    }

    // Determine if username is actually an email
    const isEmail = username.includes('@');
    
    // Query the database - check by username or email based on input format
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .or(isEmail ? `email.eq.${username}` : `username.eq.${username}`)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password (assuming passwords are hashed with bcrypt)
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set the token in a HTTP-only cookie
    cookies().set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/'
    });

    // Return user data that will be stored in localStorage
    const userData = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    return NextResponse.json({ 
      message: 'Login successful',
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
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