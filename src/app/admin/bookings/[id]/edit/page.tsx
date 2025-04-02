'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ErrorAlert from '@/components/ui/ErrorAlert';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO } from 'date-fns';

interface Booking {
  id: string;
  booking_id: string;
  customer_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  status: string;
  total_amount: number;
  payment_status: string;
  notes?: string;
  customer_name?: string;
  vehicle_model?: string;
  documents?: Record<string, string>;
  signature?: string;
  father_phone?: string;
  mother_phone?: string;
  emergency_contact1?: string;
  emergency_contact2?: string;
}

interface DocumentsState {
  photo: string | null;
  dl_front: string | null;
  dl_back: string | null;
  aadhar_front: string | null;
  aadhar_back: string | null;
}

// TIME SELECTOR COMPONENT
const TimeSelector = ({ 
  selected, 
  onChange, 
  className 
}: { 
  selected: Date | null, 
  onChange: (date: Date) => void,
  className?: string 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Generate time options for 24 hours (12am to 11:30pm)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of [0, 30]) {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        
        options.push({
          hour,
          minute,
          display: `${displayHour}:${minute === 0 ? '00' : minute} ${period}`
        });
      }
    }
    return options;
  };
  
  const timeOptions = generateTimeOptions();
  
  // Format the currently selected time
  const formatSelectedTime = () => {
    if (!selected) return "Select time";
    
    const hours = selected.getHours();
    const minutes = selected.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    
    return `${displayHours}:${minutes === 0 ? '00' : minutes} ${period}`;
  };
  
  // Handle time selection
  const handleTimeSelect = (hour: number, minute: number) => {
    let newDate: Date;
    
    if (selected) {
      // Create a new date object to avoid mutating the original
      newDate = new Date(selected);
    } else {
      newDate = new Date();
    }
    
    // Set the hours and minutes
    newDate.setHours(hour);
    newDate.setMinutes(minute);
    newDate.setSeconds(0);
    newDate.setMilliseconds(0);
    
    // Call the onChange prop with the new date
    onChange(newDate);
    setShowDropdown(false);
  };
  
  // Check if a time option is currently selected
  const isTimeSelected = (hour: number, minute: number) => {
    if (!selected) return false;
    return selected.getHours() === hour && selected.getMinutes() === minute;
  };
  
  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);
  
  // Group time options by period (Morning, Afternoon, Evening)
  const morningTimes = timeOptions.slice(0, 24); // 12am to 11:30am
  const afternoonTimes = timeOptions.slice(24, 36); // 12pm to 5:30pm
  const eveningTimes = timeOptions.slice(36); // 6pm to 11:30pm
  
  return (
    <div className="relative inline-block w-full">
      <button
        ref={buttonRef}
        type="button"
        className={`w-full flex items-center justify-between py-2 px-3 border border-gray-300 rounded shadow-sm text-sm bg-white hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${className || ""}`}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <span className={!selected ? 'text-gray-400' : 'text-gray-900 font-medium'}>
          {formatSelectedTime()}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-4 h-4 text-gray-500"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-xl z-50"
          style={{ maxHeight: '280px', overflowY: 'auto' }}
        >
          <div className="grid grid-cols-3 gap-1 p-2">
            <div className="col-span-3 border-b border-gray-100 py-1 px-2 bg-gray-50 mb-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Morning</span>
            </div>
            {morningTimes.map((time, index) => (
              <button
                key={`morning-${index}`}
                type="button"
                className={`text-center py-1 px-1 text-xs rounded-md transition-colors ${
                  isTimeSelected(time.hour, time.minute)
                    ? 'bg-orange-600 text-white font-medium shadow-sm'
                    : 'text-gray-700 hover:bg-orange-50'
                }`}
                onClick={() => handleTimeSelect(time.hour, time.minute)}
              >
                {time.display}
              </button>
            ))}
            
            <div className="col-span-3 border-b border-t border-gray-100 py-1 px-2 bg-gray-50 my-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Afternoon</span>
            </div>
            {afternoonTimes.map((time, index) => (
              <button
                key={`afternoon-${index}`}
                type="button"
                className={`text-center py-1 px-1 text-xs rounded-md transition-colors ${
                  isTimeSelected(time.hour, time.minute)
                    ? 'bg-orange-600 text-white font-medium shadow-sm'
                    : 'text-gray-700 hover:bg-orange-50'
                }`}
                onClick={() => handleTimeSelect(time.hour, time.minute)}
              >
                {time.display}
              </button>
            ))}
            
            <div className="col-span-3 border-b border-t border-gray-100 py-1 px-2 bg-gray-50 my-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Evening</span>
            </div>
            {eveningTimes.map((time, index) => (
              <button
                key={`evening-${index}`}
                type="button"
                className={`text-center py-1 px-1 text-xs rounded-md transition-colors ${
                  isTimeSelected(time.hour, time.minute)
                    ? 'bg-orange-600 text-white font-medium shadow-sm'
                    : 'text-gray-700 hover:bg-orange-50'
                }`}
                onClick={() => handleTimeSelect(time.hour, time.minute)}
              >
                {time.display}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function EditBookingPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    start_date: null as Date | null,
    end_date: null as Date | null,
    total_amount: 0,
    status: '',
    payment_status: '',
    notes: '',
    father_phone: '',
    mother_phone: '',
    emergency_contact1: '',
    emergency_contact2: ''
  });
  const [documents, setDocuments] = useState<DocumentsState>({
    photo: null,
    dl_front: null,
    dl_back: null,
    aadhar_front: null,
    aadhar_back: null
  });
  const [signature, setSignature] = useState<string | null>(null);

  const fetchBookingDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings/${params.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      
      const data = await response.json();
      
      if (!data.success || !data.booking) {
        throw new Error(data.error || 'Failed to load booking data');
      }
      
      setBooking(data.booking);
      
      // Parse dates as Date objects
      const parseDate = (dateString: string) => {
        try {
          return new Date(dateString);
        } catch (error) {
          console.error("Error parsing date:", error);
          return null;
        }
      };
      
      // Initialize form data
      setFormData({
        start_date: parseDate(data.booking.start_date),
        end_date: parseDate(data.booking.end_date),
        total_amount: data.booking.total_amount || 0,
        status: data.booking.status || 'pending',
        payment_status: data.booking.payment_status || 'pending',
        notes: typeof data.booking.notes === 'string' ? data.booking.notes : '',
        father_phone: data.booking.father_phone || '',
        mother_phone: data.booking.mother_phone || '',
        emergency_contact1: data.booking.emergency_contact1 || '',
        emergency_contact2: data.booking.emergency_contact2 || ''
      });

      // Initialize documents data if available
      if (data.booking.documents) {
        setDocuments({
          photo: data.booking.documents.photo || null,
          dl_front: data.booking.documents.dl_front || null,
          dl_back: data.booking.documents.dl_back || null,
          aadhar_front: data.booking.documents.aadhar_front || null,
          aadhar_back: data.booking.documents.aadhar_back || null
        });
      }

      // Initialize signature if available
      if (data.booking.signature) {
        setSignature(data.booking.signature);
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    try {
      setSaving(true);
      
      // Prepare the data for submission, converting dates to ISO strings
      const submissionData = {
        ...formData,
        start_date: formData.start_date?.toISOString() || '',
        end_date: formData.end_date?.toISOString() || '',
      };
      
      // First, save the basic booking information
      const response = await fetch(`/api/bookings/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update booking');
      }

      // Then, save documents and signature if they have been updated
      const docPayload = {
        documents: Object.fromEntries(
          Object.entries(documents).filter(([_, value]) => value !== null)
        ),
        signature
      };

      console.log('Documents payload has keys:', Object.keys(docPayload.documents).length > 0 ? Object.keys(docPayload.documents) : 'No documents');
      console.log('Signature present:', docPayload.signature ? 'Yes' : 'No');

      // Only send if we have something to update
      if (Object.keys(docPayload.documents).length > 0 || docPayload.signature) {
        console.log('Sending document/signature update request...');
        
        const docResponse = await fetch(`/api/bookings/${params.id}/documents`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(docPayload),
        });

        const docResult = await docResponse.json();
        console.log('Document update response:', docResult);

        if (!docResponse.ok) {
          toast.error(`Document update: ${docResult.error || 'Failed to update documents'}`);
        } else {
          console.log('Documents updated successfully');
          toast.success('Documents updated successfully');
        }
      } else {
        console.log('No documents or signature to update');
      }

      toast.success('Booking updated successfully');
      router.push(`/admin/bookings/${params.id}`);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update booking');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle datetime-local inputs
    if (name === 'start_date' || name === 'end_date') {
      try {
        // Parse the datetime-local input value to a Date object
        const date = value ? new Date(value) : null;
        setFormData(prev => ({
          ...prev,
          [name]: date
        }));
      } catch (error) {
        console.error(`Error parsing ${name}:`, error);
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'total_amount' ? parseFloat(value) || 0 : value
      }));
    }
  };

  const handleStartDateChange = (date: Date | null) => {
    if (!date) return;
    
    // If changing just the date part
    if (formData.start_date) {
      // Preserve the time from the current start_date
      const newDate = new Date(date);
      newDate.setHours(formData.start_date.getHours());
      newDate.setMinutes(formData.start_date.getMinutes());
      newDate.setSeconds(0, 0);
      
      setFormData(prev => ({
        ...prev,
        start_date: newDate
      }));
    } else {
      // If no existing date, just use the new date
      setFormData(prev => ({
        ...prev,
        start_date: date
      }));
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (!date) return;
    
    // If changing just the date part
    if (formData.end_date) {
      // Preserve the time from the current end_date
      const newDate = new Date(date);
      newDate.setHours(formData.end_date.getHours());
      newDate.setMinutes(formData.end_date.getMinutes());
      newDate.setSeconds(0, 0);
      
      setFormData(prev => ({
        ...prev,
        end_date: newDate
      }));
    } else {
      // If no existing date, just use the new date
      setFormData(prev => ({
        ...prev,
        end_date: date
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof DocumentsState) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setDocuments(prev => ({
        ...prev,
        [type]: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSignature(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDocument = (type: keyof DocumentsState) => {
    setDocuments(prev => ({
      ...prev,
      [type]: null
    }));
  };

  const handleRemoveSignature = () => {
    setSignature(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!booking) {
    return <ErrorAlert message="Booking not found" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Edit Booking
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {booking.booking_id} - {booking.customer_name}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <form onSubmit={handleSubmit}>
          <div className="px-4 py-5 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700">
                  Start Date
                </label>
                <div className="mt-1">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <DatePicker
                        selected={formData.start_date}
                        onChange={handleStartDateChange}
                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        dateFormat="MMM d, yyyy"
                        placeholderText="Select start date"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <TimeSelector
                        selected={formData.start_date}
                        onChange={(date) => {
                          if (formData.start_date) {
                            const newDate = new Date(formData.start_date);
                            newDate.setHours(date.getHours());
                            newDate.setMinutes(date.getMinutes());
                            newDate.setSeconds(0, 0);
                            setFormData(prev => ({ ...prev, start_date: newDate }));
                          } else {
                            setFormData(prev => ({ ...prev, start_date: date }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700">
                  End Date
                </label>
                <div className="mt-1">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                      <DatePicker
                        selected={formData.end_date}
                        onChange={handleEndDateChange}
                        className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        dateFormat="MMM d, yyyy"
                        placeholderText="Select end date"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex-1">
                      <TimeSelector
                        selected={formData.end_date}
                        onChange={(date) => {
                          if (formData.end_date) {
                            const newDate = new Date(formData.end_date);
                            newDate.setHours(date.getHours());
                            newDate.setMinutes(date.getMinutes());
                            newDate.setSeconds(0, 0);
                            setFormData(prev => ({ ...prev, end_date: newDate }));
                          } else {
                            setFormData(prev => ({ ...prev, end_date: date }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="total_amount" className="block text-sm font-medium text-gray-700">
                  Total Amount (₹)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    name="total_amount"
                    id="total_amount"
                    className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={formData.total_amount}
                    onChange={handleChange}
                    min="0"
                    step="1"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <div className="mt-1">
                  <select
                    id="status"
                    name="status"
                    className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={formData.status}
                    onChange={handleChange}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700">
                  Payment Status
                </label>
                <div className="mt-1">
                  <select
                    id="payment_status"
                    name="payment_status"
                    className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={formData.payment_status}
                    onChange={handleChange}
                    required
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <div className="mt-1">
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="border-b border-gray-200">
                <div className="px-4 py-5 sm:p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contacts</h3>
                    <p className="mt-1 text-sm text-gray-500 mb-4">Contact information for emergencies</p>
                  </div>

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="father_phone" className="block text-sm font-medium text-gray-700">
                        Father's Phone
                      </label>
                      <div className="mt-1">
                        <input
                          type="tel"
                          name="father_phone"
                          id="father_phone"
                          className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={formData.father_phone}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="mother_phone" className="block text-sm font-medium text-gray-700">
                        Mother's Phone
                      </label>
                      <div className="mt-1">
                        <input
                          type="tel"
                          name="mother_phone"
                          id="mother_phone"
                          className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={formData.mother_phone}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="emergency_contact1" className="block text-sm font-medium text-gray-700">
                        Emergency Contact 1
                      </label>
                      <div className="mt-1">
                        <input
                          type="tel"
                          name="emergency_contact1"
                          id="emergency_contact1"
                          className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={formData.emergency_contact1}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="emergency_contact2" className="block text-sm font-medium text-gray-700">
                        Emergency Contact 2
                      </label>
                      <div className="mt-1">
                        <input
                          type="tel"
                          name="emergency_contact2"
                          id="emergency_contact2"
                          className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          value={formData.emergency_contact2}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Customer Documents</h3>
              <p className="mt-1 text-sm text-gray-500">Upload customer documents for verification</p>
              
              <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                {/* Photo */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Photo</label>
                  <div className="flex items-center">
                    {documents.photo ? (
                      <div className="relative w-full">
                        <div className="text-xs text-gray-500 mb-1">Customer Photo</div>
                        <img 
                          src={documents.photo} 
                          alt="Customer Photo" 
                          className="h-40 w-full object-cover rounded-md border bg-white" 
                        />
                        <button
                          type="button"
                          className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 focus:outline-none"
                          onClick={() => handleRemoveDocument('photo')}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="mb-2 flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Upload customer's photo
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          onChange={(e) => handleFileChange(e, 'photo')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* DL Front */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driving License (Front)</label>
                  <div className="flex items-center">
                    {documents.dl_front ? (
                      <div className="relative w-full">
                        <div className="text-xs text-gray-500 mb-1">Driving License Front Side</div>
                        <img 
                          src={documents.dl_front} 
                          alt="DL Front" 
                          className="h-40 w-full object-cover rounded-md border bg-white" 
                        />
                        <button
                          type="button"
                          className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 focus:outline-none"
                          onClick={() => handleRemoveDocument('dl_front')}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="mb-2 flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                          Upload front side of license
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          onChange={(e) => handleFileChange(e, 'dl_front')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* DL Back */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Driving License (Back)</label>
                  <div className="flex items-center">
                    {documents.dl_back ? (
                      <div className="relative w-full">
                        <div className="text-xs text-gray-500 mb-1">Driving License Back Side</div>
                        <img 
                          src={documents.dl_back} 
                          alt="DL Back" 
                          className="h-40 w-full object-cover rounded-md border bg-white" 
                        />
                        <button
                          type="button"
                          className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 focus:outline-none"
                          onClick={() => handleRemoveDocument('dl_back')}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="mb-2 flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                          Upload back side of license
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          onChange={(e) => handleFileChange(e, 'dl_back')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Aadhar Front */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Card (Front)</label>
                  <div className="flex items-center">
                    {documents.aadhar_front ? (
                      <div className="relative w-full">
                        <div className="text-xs text-gray-500 mb-1">Aadhar Card Front Side</div>
                        <img 
                          src={documents.aadhar_front} 
                          alt="Aadhar Front" 
                          className="h-40 w-full object-cover rounded-md border bg-white" 
                        />
                        <button
                          type="button"
                          className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 focus:outline-none"
                          onClick={() => handleRemoveDocument('aadhar_front')}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="mb-2 flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Upload front side of Aadhar
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          onChange={(e) => handleFileChange(e, 'aadhar_front')}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Aadhar Back */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aadhar Card (Back)</label>
                  <div className="flex items-center">
                    {documents.aadhar_back ? (
                      <div className="relative w-full">
                        <div className="text-xs text-gray-500 mb-1">Aadhar Card Back Side</div>
                        <img 
                          src={documents.aadhar_back} 
                          alt="Aadhar Back" 
                          className="h-40 w-full object-cover rounded-md border bg-white" 
                        />
                        <button
                          type="button"
                          className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 focus:outline-none"
                          onClick={() => handleRemoveDocument('aadhar_back')}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="mb-2 flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Upload back side of Aadhar
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          onChange={(e) => handleFileChange(e, 'aadhar_back')}
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Signature */}
                <div className="sm:col-span-2 border rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Signature</label>
                  <div className="flex items-center">
                    {signature ? (
                      <div className="relative w-full">
                        <div className="text-xs text-gray-500 mb-1">Customer Signature</div>
                        <img 
                          src={signature} 
                          alt="Customer Signature" 
                          className="h-32 max-w-md object-contain bg-white p-2 border rounded-md" 
                        />
                        <button
                          type="button"
                          className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 focus:outline-none"
                          onClick={handleRemoveSignature}
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="mb-2 flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          Upload customer's signature
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          onChange={handleSignatureChange}
                        />
                        <p className="mt-2 text-xs text-gray-500">Upload an image of the customer's signature</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              type="button"
              className="mr-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              onClick={() => router.back()}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 