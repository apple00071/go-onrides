// Configuration for all API routes

// IMPORTANT: These settings must be exported from every API route that uses cookies
// by adding: export { dynamic, runtime } from '@/app/api/config';
export const dynamic = 'force-dynamic' as const;
export const runtime = 'nodejs' as const;

// Revalidation settings
export const revalidate = 0; // Disable cache

// CORS configuration
export const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
} as const;

// Helper function to handle CORS preflight requests
export async function handleCORS(request: Request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
      },
    });
  }
  return null;
} 