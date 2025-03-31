'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import ErrorAlert from '@/components/ui/ErrorAlert';

interface UserFormProps {
  user?: User;
  onSubmit: (data: Partial<User>) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
  mode: 'create' | 'edit';
}

export default function UserForm({
  user,
  onSubmit,
  isSubmitting,
  submitError,
  mode
}: UserFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<User>>({
    full_name: '',
    email: '',
    role: 'worker',
    status: 'active',
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // If in edit mode and user data is provided, populate the form
  useEffect(() => {
    if (mode === 'edit' && user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role || 'worker',
        status: user.status || 'active',
      });
    }
  }, [user, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    // Password validation for new users
    if (mode === 'create') {
      if (!password) {
        setPasswordError('Password is required');
        return false;
      }
      
      if (password.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        return false;
      }
      
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return false;
      }
    }
    
    // Password validation for existing users (only if they're changing it)
    if (mode === 'edit' && password) {
      if (password.length < 8) {
        setPasswordError('Password must be at least 8 characters long');
        return false;
      }
      
      if (password !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return false;
      }
    }
    
    setPasswordError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Include password in submission data if provided
    const submissionData = {
      ...formData,
      ...(password ? { password } : {})
    };
    
    await onSubmit(submissionData);
  };

  const handleCancel = () => {
    if (mode === 'edit' && user) {
      router.push(`/admin/users/${user.id}`);
    } else {
      router.push('/admin/users');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && <ErrorAlert message={submitError} />}
      {passwordError && <ErrorAlert message={passwordError} onDismiss={() => setPasswordError(null)} />}
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {mode === 'create' ? 'New User Account' : 'Edit User Account'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {mode === 'create' 
                ? 'Create a new admin or worker account.' 
                : 'Update user account information.'}
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full name *
                </label>
                <input
                  type="text"
                  name="full_name"
                  id="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address *
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role *
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="worker">Worker</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full bg-white border border-gray-300 rounded-md py-2 px-3 shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  {mode === 'create' ? 'Password *' : 'New Password'}
                  {mode === 'edit' && <span className="text-xs text-gray-500 ml-1">(Leave blank to keep current password)</span>}
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={mode === 'create'}
                  className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  {mode === 'create' ? 'Confirm Password *' : 'Confirm New Password'}
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required={mode === 'create'}
                  className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleCancel}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-orange-300"
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create User' : 'Update User'}
        </button>
      </div>
    </form>
  );
} 