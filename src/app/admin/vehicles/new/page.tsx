'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function NewVehiclePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    model: '',
    type: 'bike',
    number_plate: '',
    status: 'available',
    daily_rate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const dataToSend = {
        ...formData,
        daily_rate: parseFloat(formData.daily_rate)
      };

      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = result.error || 'Failed to create vehicle';
        
        // Try to extract more detailed error information if available
        if (result.message && typeof result.message === 'string') {
          errorMessage = result.message;
        }
        
        throw new Error(errorMessage);
      }

      toast.success('Vehicle created successfully');
      
      // Add a slight delay before redirect to ensure state is updated
      setTimeout(() => {
        router.push('/admin/vehicles');
      }, 500);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      
      // Show more detailed error message to help with debugging
      const errorMessage = error instanceof Error ? error.message : 'Failed to create vehicle';
      toast.error(errorMessage);
      
      // Log additional details for debugging
      console.log('Form data that caused the error:', formData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Add New Vehicle</h1>
        <p className="mt-2 text-sm text-gray-700">Add a new vehicle to your fleet.</p>
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Model */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                Model
              </label>
              <input
                type="text"
                name="model"
                id="model"
                required
                value={formData.model}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              />
            </div>

            {/* Type */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Type
              </label>
              <select
                name="type"
                id="type"
                required
                value={formData.type}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              >
                <option value="bike">Bike</option>
                <option value="scooter">Scooter</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
            </div>

            {/* Number Plate */}
            <div>
              <label htmlFor="number_plate" className="block text-sm font-medium text-gray-700">
                Number Plate
              </label>
              <input
                type="text"
                name="number_plate"
                id="number_plate"
                required
                value={formData.number_plate}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                id="status"
                required
                value={formData.status}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              >
                <option value="available">Available</option>
                <option value="maintenance">Maintenance</option>
                <option value="rented">Rented</option>
              </select>
            </div>

            {/* Daily Rate */}
            <div>
              <label htmlFor="daily_rate" className="block text-sm font-medium text-gray-700">
                Daily Rate (₹)
              </label>
              <input
                type="number"
                name="daily_rate"
                id="daily_rate"
                required
                min="0"
                step="0.01"
                value={formData.daily_rate}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 