'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { toast } from 'react-hot-toast';

interface Settings {
  company_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  booking_settings: {
    min_booking_duration: number;
    max_booking_duration: number;
    advance_booking_days: number;
    cancellation_period: number;
    late_return_fee: number;
  };
  notification_settings: {
    email_notifications: boolean;
    sms_notifications: boolean;
    booking_confirmation: boolean;
    booking_reminder: boolean;
    payment_reminder: boolean;
    return_reminder: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({
    company_name: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    booking_settings: {
      min_booking_duration: 1,
      max_booking_duration: 30,
      advance_booking_days: 30,
      cancellation_period: 24,
      late_return_fee: 500
    },
    notification_settings: {
      email_notifications: true,
      sms_notifications: true,
      booking_confirmation: true,
      booking_reminder: true,
      payment_reminder: true,
      return_reminder: true
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/settings', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      
      const data = await response.json();
      if (data.success) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      if (section === 'booking_settings' || section === 'notification_settings') {
        setSettings(prev => ({
          ...prev,
          [section]: {
            ...prev[section],
            [field]: type === 'checkbox' ? checked : value
          }
        }));
      }
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorAlert message={error} />
      </div>
    );
  }

        return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your business settings and preferences
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        {/* Company Information */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Company Information</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  type="text"
                  name="company_name"
                  id="company_name"
                  value={settings.company_name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="gst_number" className="block text-sm font-medium text-gray-700">
                  GST Number
                </label>
                <input
                  type="text"
                  name="gst_number"
                  id="gst_number"
                  value={settings.gst_number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700">
                  Contact Email
                </label>
                <input
                  type="email"
                  name="contact_email"
                  id="contact_email"
                  value={settings.contact_email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-700">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  name="contact_phone"
                  id="contact_phone"
                  value={settings.contact_phone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  id="address"
                  value={settings.address}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  id="city"
                  value={settings.city}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                  State
                </label>
              <input
                  type="text"
                  name="state"
                  id="state"
                  value={settings.state}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              />
            </div>

              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-gray-700">
                  Pincode
              </label>
                <input
                  type="text"
                  name="pincode"
                  id="pincode"
                  value={settings.pincode}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Booking Settings */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Booking Settings</h3>
            <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
                <label htmlFor="booking_settings.min_booking_duration" className="block text-sm font-medium text-gray-700">
                  Minimum Booking Duration (hours)
            </label>
                <input
                  type="number"
                  name="booking_settings.min_booking_duration"
                  id="booking_settings.min_booking_duration"
                  value={settings.booking_settings.min_booking_duration}
                  onChange={handleInputChange}
                  min="1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                />
          </div>
        
          <div>
                <label htmlFor="booking_settings.max_booking_duration" className="block text-sm font-medium text-gray-700">
                  Maximum Booking Duration (days)
            </label>
                <input
                  type="number"
                  name="booking_settings.max_booking_duration"
                  id="booking_settings.max_booking_duration"
                  value={settings.booking_settings.max_booking_duration}
                  onChange={handleInputChange}
                  min="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
            />
          </div>
        
          <div>
                <label htmlFor="booking_settings.advance_booking_days" className="block text-sm font-medium text-gray-700">
                  Advance Booking Days
            </label>
            <input
              type="number"
                  name="booking_settings.advance_booking_days"
                  id="booking_settings.advance_booking_days"
                  value={settings.booking_settings.advance_booking_days}
                  onChange={handleInputChange}
                  min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
            />
          </div>
        
          <div>
                <label htmlFor="booking_settings.cancellation_period" className="block text-sm font-medium text-gray-700">
                  Cancellation Period (hours)
            </label>
            <input
                  type="number"
                  name="booking_settings.cancellation_period"
                  id="booking_settings.cancellation_period"
                  value={settings.booking_settings.cancellation_period}
                  onChange={handleInputChange}
                  min="0"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
            />
          </div>

              <div>
                <label htmlFor="booking_settings.late_return_fee" className="block text-sm font-medium text-gray-700">
                  Late Return Fee (₹)
                </label>
                <input
                  type="number"
                  name="booking_settings.late_return_fee"
                  id="booking_settings.late_return_fee"
                  value={settings.booking_settings.late_return_fee}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                />
            </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Notification Settings</h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="notification_settings.email_notifications"
                    id="notification_settings.email_notifications"
                    checked={settings.notification_settings.email_notifications}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notification_settings.email_notifications" className="font-medium text-gray-700">
                    Email Notifications
                  </label>
                  <p className="text-gray-500">Receive notifications via email</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="notification_settings.sms_notifications"
                    id="notification_settings.sms_notifications"
                    checked={settings.notification_settings.sms_notifications}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notification_settings.sms_notifications" className="font-medium text-gray-700">
                    SMS Notifications
                  </label>
                  <p className="text-gray-500">Receive notifications via SMS</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="notification_settings.booking_confirmation"
                    id="notification_settings.booking_confirmation"
                    checked={settings.notification_settings.booking_confirmation}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notification_settings.booking_confirmation" className="font-medium text-gray-700">
                    Booking Confirmation
                  </label>
                  <p className="text-gray-500">Send booking confirmation notifications</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="notification_settings.booking_reminder"
                    id="notification_settings.booking_reminder"
                    checked={settings.notification_settings.booking_reminder}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notification_settings.booking_reminder" className="font-medium text-gray-700">
                    Booking Reminder
                  </label>
                  <p className="text-gray-500">Send booking reminder notifications</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="notification_settings.payment_reminder"
                    id="notification_settings.payment_reminder"
                    checked={settings.notification_settings.payment_reminder}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notification_settings.payment_reminder" className="font-medium text-gray-700">
                    Payment Reminder
                  </label>
                  <p className="text-gray-500">Send payment reminder notifications</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="notification_settings.return_reminder"
                    id="notification_settings.return_reminder"
                    checked={settings.notification_settings.return_reminder}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="notification_settings.return_reminder" className="font-medium text-gray-700">
                    Return Reminder
                  </label>
                  <p className="text-gray-500">Send vehicle return reminder notifications</p>
                </div>
              </div>
        </div>
          </div>
                  </div>
                
                <div className="flex justify-end">
                  <button
            type="submit"
                    disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                        Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                </div>
      </form>
    </div>
  );
} 