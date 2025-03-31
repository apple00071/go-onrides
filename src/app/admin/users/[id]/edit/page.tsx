'use client';

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { Permission } from '@/types';
import { toast } from 'react-hot-toast';

interface EditUserPageProps {
  params: {
    id: string;
  };
}

type UserRole = 'worker' | 'admin';

interface UserFormData {
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: 'active' | 'inactive';
  password?: string;
  permissions: Permission[];
}

const availablePermissions: Permission[] = [
  'bookings.view',
  'bookings.create',
  'bookings.update',
  'bookings.delete',
  'bookings.return',
  'vehicles.view',
  'vehicles.create',
  'vehicles.update',
  'vehicles.delete',
  'customers.view',
  'customers.create',
  'customers.update',
  'customers.delete',
  'dashboard.stats'
];

const permissionGroups = {
  'Bookings': [
    'bookings.view',
    'bookings.create',
    'bookings.update',
    'bookings.delete',
    'bookings.return'
  ],
  'Vehicles': [
    'vehicles.view',
    'vehicles.create',
    'vehicles.update',
    'vehicles.delete'
  ],
  'Customers': [
    'customers.view',
    'customers.create',
    'customers.update',
    'customers.delete'
  ],
  'Dashboard': [
    'dashboard.stats'
  ]
};

export default function EditUserPage({ params }: EditUserPageProps) {
  const { id } = params;
  const router = useRouter();
  const [userData, setUserData] = useState<UserFormData>({
    full_name: '',
    email: '',
    phone: '',
    role: 'worker',
    status: 'active',
    password: '',
    permissions: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      if (!id) {
        setError('User ID is required');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/users/${id}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          const data = await response.json();
          if (response.status === 404) {
            throw new Error('User not found');
          } else if (response.status === 401) {
            throw new Error('Please log in to edit user details');
          } else if (response.status === 403) {
            throw new Error('You do not have permission to edit user details');
          }
          throw new Error(data.error || 'Failed to fetch user details');
        }
        
        const data = await response.json();
        setUserData({
          full_name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'worker',
          status: data.status || 'active',
          password: '',
          permissions: data.permissions || [],
        });
      } catch (err) {
        console.error('Error fetching user details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load user details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, [id]);
  
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          full_name: userData.full_name,
          email: userData.email,
          phone: userData.phone || undefined,
          role: userData.role,
          status: userData.status,
          password: userData.password || undefined,
          permissions: userData.permissions
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      toast.success('User updated successfully');
      router.push(`/admin/users/${id}`);
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handlePermissionChange = (permission: Permission) => {
    setUserData(prev => {
      const newPermissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions: newPermissions };
    });
  };

  const handleGroupPermissionChange = (group: string, checked: boolean) => {
    setUserData(prev => {
      const groupPermissions = permissionGroups[group as keyof typeof permissionGroups];
      let newPermissions = [...prev.permissions];
      
      if (checked) {
        // Add all permissions from the group that aren't already included
        groupPermissions.forEach(permission => {
          if (!newPermissions.includes(permission as Permission)) {
            newPermissions.push(permission as Permission);
          }
        });
      } else {
        // Remove all permissions from the group
        newPermissions = newPermissions.filter(
          permission => !groupPermissions.includes(permission)
        );
      }
      
      return { ...prev, permissions: newPermissions };
    });
  };

  const isGroupChecked = (group: string): boolean => {
    const groupPermissions = permissionGroups[group as keyof typeof permissionGroups];
    return groupPermissions.every(permission => 
      userData.permissions.includes(permission as Permission)
    );
  };

  const isGroupIndeterminate = (group: string): boolean => {
    const groupPermissions = permissionGroups[group as keyof typeof permissionGroups];
    const checkedCount = groupPermissions.filter(permission => 
      userData.permissions.includes(permission as Permission)
    ).length;
    return checkedCount > 0 && checkedCount < groupPermissions.length;
  };
  
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error && !userData.email) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <ErrorAlert message={error} />
        <button
          onClick={() => router.push('/admin/users')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Edit User</h1>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Back
        </button>
      </div>
      
      {error && <ErrorAlert message={error} />}
      {success && (
        <div className="mt-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="mt-6 space-y-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="full_name"
                    id="full_name"
                    value={userData.full_name}
                    onChange={handleInputChange}
                    required
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={userData.email}
                    onChange={handleInputChange}
                    required
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    value={userData.phone}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    id="role"
                    name="role"
                    value={userData.role}
                    onChange={handleInputChange}
                    required
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="admin">Admin</option>
                    <option value="worker">Worker</option>
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    id="status"
                    name="status"
                    value={userData.status}
                    onChange={handleInputChange}
                    required
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              
              <div className="sm:col-span-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <div className="mt-1">
                  <input
                    type="password"
                    name="password"
                    id="password"
                    value={userData.password}
                    onChange={handleInputChange}
                    placeholder="Leave blank to keep current password"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-5 sm:p-6 border-t border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Permissions
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {userData.role === 'admin' ? (
                <p className="text-sm text-gray-600 italic">
                  Admin users have all permissions by default
                </p>
              ) : (
                Object.entries(permissionGroups).map(([group, permissions]) => (
                  <div key={group} className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`group-${group}`}
                        checked={isGroupChecked(group)}
                        ref={el => {
                          if (el) {
                            el.indeterminate = isGroupIndeterminate(group);
                          }
                        }}
                        onChange={(e) => handleGroupPermissionChange(group, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label
                        htmlFor={`group-${group}`}
                        className="ml-2 text-sm font-medium text-gray-700"
                      >
                        {group}
                      </label>
                    </div>
                    <div className="ml-6 grid grid-cols-1 gap-2">
                      {permissions.map((permission) => (
                        <label
                          key={permission}
                          className="flex items-center space-x-3"
                        >
                          <input
                            type="checkbox"
                            checked={userData.permissions.includes(permission as Permission)}
                            onChange={() => handlePermissionChange(permission as Permission)}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" color="white" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 