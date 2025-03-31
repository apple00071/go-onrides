import { NextRequest } from 'next/server';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'worker';
  fullName: string;
  email: string;
  status: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user: User;
} 