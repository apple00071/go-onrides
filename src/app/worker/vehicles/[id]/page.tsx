'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { formatCurrency } from '@/lib/format';
import { getStatusColor } from '@/lib/utils';

interface VehicleDetailsProps {
  params: {
    id: string;
  };
}

interface MaintenanceRecord {
  id: number;
  date: string;
  type: string;
  description: string;
  cost: number;
  performed_by: string;
}

interface EnhancedVehicle {
  id: number;
  type: string;
  model: string;
  number_plate: string;
  manufacturer?: string;
  year?: number;
  color?: string;
  status: 'available' | 'rented' | 'maintenance' | 'retired';
  daily_rate: number;
  description?: string;
  features?: string[];
  maintenance_history?: MaintenanceRecord[];
  created_at: string;
  updated_at?: string;
}

export default function VehicleDetailsPage({ params }: VehicleDetailsProps) {
  const [vehicle, setVehicle] = useState<EnhancedVehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVehicleDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/worker/vehicles/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vehicle details');
      }
      const data = await response.json();
      setVehicle(data);
    } catch (error) {
      console.error('Error fetching vehicle details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchVehicleDetails();
  }, [fetchVehicleDetails]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!vehicle) return <ErrorAlert message="Vehicle not found" />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Vehicle Details
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Detailed information about the vehicle.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Basic Information</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <dl>
                    <dt className="text-sm text-gray-500">Model</dt>
                    <dd className="text-sm text-gray-900">{vehicle.model}</dd>
                    <dt className="mt-2 text-sm text-gray-500">Type</dt>
                    <dd className="text-sm text-gray-900">{vehicle.type}</dd>
                    {vehicle.year && (
                      <>
                        <dt className="mt-2 text-sm text-gray-500">Year</dt>
                        <dd className="text-sm text-gray-900">{vehicle.year}</dd>
                      </>
                    )}
                  </dl>
                  <dl>
                    <dt className="text-sm text-gray-500">Daily Rate</dt>
                    <dd className="text-sm text-gray-900">{formatCurrency(vehicle.daily_rate)}</dd>
                    <dt className="mt-2 text-sm text-gray-500">Number Plate</dt>
                    <dd className="text-sm text-gray-900">{vehicle.number_plate}</dd>
                  </dl>
                </div>
              </dd>
            </div>

            <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(vehicle.status)}`}>
                  {vehicle.status}
                </span>
              </dd>
            </div>

            {vehicle.description && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  {vehicle.description}
                </dd>
              </div>
            )}

            {vehicle.features && vehicle.features.length > 0 && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Features</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  <div className="flex flex-wrap gap-2">
                    {vehicle.features.map((feature, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-full bg-gray-100 px-3 py-0.5 text-sm font-medium text-gray-800"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
            )}

            {vehicle.maintenance_history && vehicle.maintenance_history.length > 0 && (
              <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Maintenance History</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                  <div className="mt-2 flow-root">
                    <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                      <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <table className="min-w-full divide-y divide-gray-300">
                          <thead>
                            <tr>
                              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                                Date
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Type
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Description
                              </th>
                              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                Cost
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {vehicle.maintenance_history.map((record, index) => (
                              <tr key={index}>
                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">
                                  {new Date(record.date).toLocaleDateString()}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {record.type}
                                </td>
                                <td className="px-3 py-4 text-sm text-gray-500">
                                  {record.description}
                                </td>
                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                  {formatCurrency(record.cost)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
} 