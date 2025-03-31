'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BookingForm from '@/components/forms/BookingForm';
import { toast } from 'react-hot-toast';

export default function NewBookingPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      console.log('Submitting booking data:', formData);
      
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      toast.success('Booking created successfully');
      router.push('/admin/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">New Booking</h1>
        <p className="mt-2 text-sm text-gray-700">Create a new booking for a customer.</p>
      </div>

      <BookingForm 
        role="admin" 
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
} 