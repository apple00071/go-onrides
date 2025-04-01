/**
 * Central location for managing base URLs throughout the application
 */

// Base application URL
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://goonriders.vercel.app';

// Admin dashboard URL
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || `${APP_URL}/admin`;

// Worker dashboard URL
export const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || `${APP_URL}/worker`;

// API base URL
export const API_URL = `${APP_URL}/api`;

// Function to get absolute URL
export function getAbsoluteUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${APP_URL}/${cleanPath}`;
}

// Function to get admin URL
export function getAdminUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${ADMIN_URL}/${cleanPath}`;
}

// Function to get worker URL
export function getWorkerUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${WORKER_URL}/${cleanPath}`;
}

// Function to get API URL
export function getApiUrl(path: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  return `${API_URL}/${cleanPath}`;
} 