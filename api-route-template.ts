// This is a template for API route files
// The runtime export MUST use a string literal

// CORRECT:
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// INCORRECT - will cause build errors:
// const environment = process.env.NODE_ENV;
// export const runtime = environment === 'development' ? 'nodejs' : 'edge';

// Always use string literals for these exports 