'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@/types';
import ErrorAlert from '@/components/ui/ErrorAlert';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: Partial<Customer>) => Promise<void>;
  isSubmitting: boolean;
  submitError: string | null;
  mode: 'create' | 'edit';
}

export default function CustomerForm({
  customer,
  onSubmit,
  isSubmitting,
  submitError,
  mode
}: CustomerFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<Partial<Customer>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    father_phone: '',
    mother_phone: '',
    emergency_contact1: '',
    emergency_contact2: '',
    id_type: '',
    id_number: '',
    notes: ''
  });

  // If in edit mode and customer data is provided, populate the form
  useEffect(() => {
    if (mode === 'edit' && customer) {
      setFormData({
        first_name: customer.first_name || '',
        last_name: customer.last_name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        father_phone: customer.father_phone || '',
        mother_phone: customer.mother_phone || '',
        emergency_contact1: customer.emergency_contact1 || '',
        emergency_contact2: customer.emergency_contact2 || '',
        id_type: customer.id_type || '',
        id_number: customer.id_number || '',
        notes: customer.notes || ''
      });
    }
  }, [customer, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleCancel = () => {
    if (mode === 'edit' && customer) {
      router.push(`/admin/customers/${customer.id}`);
    } else {
      router.push('/admin/customers');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitError && <ErrorAlert message={submitError} />}
      
      <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {mode === 'create' ? 'New Customer' : 'Edit Customer'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {mode === 'create' 
                ? 'Add a new customer to the system.' 
                : 'Update customer information.'}
            </p>
          </div>
          <div className="mt-5 md:mt-0 md:col-span-2">
            <div className="grid grid-cols-6 gap-6">
              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                  First name *
                </label>
                <input
                  type="text"
                  name="first_name"
                  id="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6 sm:col-span-3">
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                  Last name *
                </label>
                <input
                  type="text"
                  name="last_name"
                  id="last_name"
                  value={formData.last_name}
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
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                />
              </div>

              <div className="col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address *
                </label>
                <textarea
                  name="address"
                  id="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows={3}
                  className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                ></textarea>
              </div>

              <div className="col-span-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Emergency Contacts
                </h4>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="father_phone" className="block text-sm font-medium text-gray-700">
                      Father's Phone
                    </label>
                    <input
                      type="tel"
                      name="father_phone"
                      id="father_phone"
                      value={formData.father_phone}
                      onChange={handleChange}
                      className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label htmlFor="mother_phone" className="block text-sm font-medium text-gray-700">
                      Mother's Phone
                    </label>
                    <input
                      type="tel"
                      name="mother_phone"
                      id="mother_phone"
                      value={formData.mother_phone}
                      onChange={handleChange}
                      className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label htmlFor="emergency_contact1" className="block text-sm font-medium text-gray-700">
                      Emergency Contact 1
                    </label>
                    <input
                      type="tel"
                      name="emergency_contact1"
                      id="emergency_contact1"
                      value={formData.emergency_contact1}
                      onChange={handleChange}
                      className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label htmlFor="emergency_contact2" className="block text-sm font-medium text-gray-700">
                      Emergency Contact 2
                    </label>
                    <input
                      type="tel"
                      name="emergency_contact2"
                      id="emergency_contact2"
                      value={formData.emergency_contact2}
                      onChange={handleChange}
                      className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Identification
                </h4>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="id_type" className="block text-sm font-medium text-gray-700">
                      ID Type
                    </label>
                    <select
                      id="id_type"
                      name="id_type"
                      value={formData.id_type}
                      onChange={handleChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
                    >
                      <option value="">Select an ID type</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Passport">Passport</option>
                      <option value="Aadhaar Card">Aadhaar Card</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="PAN Card">PAN Card</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="id_number" className="block text-sm font-medium text-gray-700">
                      ID Number
                    </label>
                    <input
                      type="text"
                      name="id_number"
                      id="id_number"
                      value={formData.id_number}
                      onChange={handleChange}
                      className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                ></textarea>
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
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create Customer' : 'Update Customer'}
        </button>
      </div>
    </form>
  );
} 