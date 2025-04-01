/**
 * This file provides a centralized way to ensure all API routes are marked as dynamic.
 * 
 * USAGE:
 * 1. Import at the top of your API route:
 *    import { ensureDynamic } from '@/app/api/ensure-dynamic';
 * 
 * 2. Export it at the beginning of your file:
 *    export const { dynamic, runtime } = ensureDynamic;
 */

// These settings are required to ensure API routes that use cookies or other
// server-side features work correctly in production with Next.js
export const ensureDynamic = {
  dynamic: 'force-dynamic' as const,
  runtime: 'nodejs' as const
}; 