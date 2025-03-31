import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function AdminPage() {
  redirect('/admin/dashboard');
  // This line will never be reached due to the redirect
  return null;
} 