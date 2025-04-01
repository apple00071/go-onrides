'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import SignaturePad from 'react-signature-canvas';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, setHours, setMinutes, addDays, parseISO, startOfDay } from 'date-fns';

interface Vehicle {
  id: number;
  model: string;
  type: string;
  number_plate: string;
  status: string;
  make?: string;
  manufacturer?: string;
  registration: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

export interface BookingFormProps {
  role?: string;
  initialData?: any;
  onSubmit?: (data: any) => Promise<{success: boolean; error?: string} | void>;
  onCancel?: () => void;
}

interface CustomerDetails {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  dl_number: string;
  dl_expiry: Date | null;
  dob: Date | null;
  aadhar_number: string;
  father_phone: string;
  mother_phone: string;
  emergency_contact1: string;
  emergency_contact2: string;
  photo: File | null;
  dl_front: File | null;
  dl_back: File | null;
  aadhar_front: File | null;
  aadhar_back: File | null;
}

interface CustomerWithDetails extends Customer {
  aadhar_number?: string;
}

interface Documents {
  photo: File | null;
  dl_front: File | null;
  dl_back: File | null;
  aadhar_front: File | null;
  aadhar_back: File | null;
}

interface DateTimeValue {
  date: string;
  time: string;
}

interface FormData {
  isExistingCustomer: boolean;
  searchTerm: string;
  selectedCustomerId: string | null;
  customerDetails: CustomerDetails;
  vehicle_id: string;
  start_date: Date | null;
  end_date: Date | null;
  notes: string;
  payment_method: string;
  pricing: {
    base_price: number;
    discount: number;
    security_deposit: number;
    tax_rate: number;
    additional_charges: number;
  };
  documents: Documents;
  fullName: string;
  email: string;
  phone: string;
  dob: Date | null;
  dlNumber: string;
  dlExpiryDate: Date | null;
  aadhaarNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  vehicleModel: string;
  rentalPackage: string;
  baseRate: number;
  securityDeposit: number;
  files: Record<string, File | null>;
  termsAccepted: boolean;
}

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

const getDatePickerWrapperStyles = () => {
  return {
    datePickerWrapper: "relative mb-4",
    datePickerContainer: "flex flex-col space-y-2",
    datePickerHeader: "text-sm font-medium text-gray-700 mb-1",
    dateInputWrapper: "relative flex items-center",
    datePickerInput: "block w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm pr-10 bg-white text-gray-800 placeholder-gray-400",
    timePickerInput: "block w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm pr-10 bg-white text-gray-800 placeholder-gray-400",
    datePickerIcon: "absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none",
    calendarSection: "flex w-full justify-between",
    customTimePicker: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm bg-white text-gray-800 hover:border-orange-400 transition-colors",
    datePicker: 'w-full',
    dateInput: 'w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500',
  };
};

export default function BookingForm({ role, onSubmit, onCancel, initialData }: BookingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const signaturePadRef = useRef<any>(null);
  
  const [formData, setFormData] = useState<FormData>({
    isExistingCustomer: false,
    searchTerm: '',
    selectedCustomerId: null,
    customerDetails: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      dl_number: '',
      dl_expiry: null,
      dob: null,
      aadhar_number: '',
      father_phone: '',
      mother_phone: '',
      emergency_contact1: '',
      emergency_contact2: '',
      photo: null,
      dl_front: null,
      dl_back: null,
      aadhar_front: null,
      aadhar_back: null
    },
    vehicle_id: '',
    start_date: null,
    end_date: null,
    notes: '',
    payment_method: 'cash',
    pricing: {
      base_price: 0,
      discount: 0,
      security_deposit: 0,
      tax_rate: 0,
      additional_charges: 0
    },
    documents: {
      photo: null,
      dl_front: null,
      dl_back: null,
      aadhar_front: null,
      aadhar_back: null
    },
    fullName: '',
    email: '',
    phone: '',
    dob: null,
    dlNumber: '',
    dlExpiryDate: null,
    aadhaarNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    vehicleModel: '',
    rentalPackage: '',
    baseRate: 0,
    securityDeposit: 0,
    files: {},
    termsAccepted: false
  });

  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    dl_number: "",
    dl_expiry: null,
    dob: null,
    aadhar_number: "",
    father_phone: "",
    mother_phone: "",
    emergency_contact1: "",
    emergency_contact2: "",
    photo: null,
    dl_front: null,
    dl_back: null,
    aadhar_front: null,
    aadhar_back: null
  });

  const [documents, setDocuments] = useState<Documents>({
    photo: null,
    dl_front: null,
    dl_back: null,
    aadhar_front: null,
    aadhar_back: null,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [searchBy, setSearchBy] = useState<'name' | 'aadhar'>('name');
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerWithDetails[]>([]);

  const [aadharNumber, setAadharNumber] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDetails | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const signatureRef = useRef<SignaturePad>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const fetchVehiclesAndCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch vehicles from the API
      const response = await fetch('/api/vehicles', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch vehicles');
      }

      const result = await response.json();
      
      // Handle the API response structure
      if (result.success && result.data?.vehicles) {
        setVehicles(result.data.vehicles);
      } else if (result.vehicles) {
        // Fallback for backwards compatibility
        setVehicles(result.vehicles);
      } else {
        // If neither structure exists, set to empty array
        setVehicles([]);
        console.warn('No vehicles found in API response:', result);
      }
      
      // Add customer fetching logic here if needed in the future
      
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch vehicles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filterCustomers = useCallback(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer => {
      if (searchBy === 'aadhar') {
        return customer.aadhar_number?.toLowerCase().includes(searchTerm.toLowerCase());
      } else {
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase()) || 
               customer.phone?.includes(searchTerm) ||
               customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
      }
    });
    setFilteredCustomers(filtered);
  }, [searchTerm, searchBy, customers]);

  useEffect(() => {
    fetchVehiclesAndCustomers();
  }, [fetchVehiclesAndCustomers]);

  useEffect(() => {
    filterCustomers();
  }, [filterCustomers]);

  useEffect(() => {
    if (formData.vehicle_id) {
      const vehicle = vehicles.find(v => v.id.toString() === formData.vehicle_id);
      setSelectedVehicle(vehicle || null);
    } else {
      setSelectedVehicle(null);
    }
  }, [formData.vehicle_id, vehicles]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      console.log("Form submission initiated");
      
      // Validate vehicle selection
      if (!formData.vehicle_id) {
        toast.error('Please select a vehicle');
        console.log("Validation failed: No vehicle selected");
        return;
      }

      // Validate customer information
      if (!formData.fullName || !formData.email || !formData.phone) {
        toast.error('Please fill in all required customer information');
        console.log("Validation failed: Missing customer details");
        return;
      }

      // Validate dates
      if (!formData.start_date || !formData.end_date) {
        toast.error('Please select valid start and end dates/times');
        console.log("Validation failed: Missing date/time selection");
        return;
      }

      if (formData.end_date <= formData.start_date) {
        toast.error('End date must be after start date');
        console.log("Validation failed: End date is not after start date");
        return;
      }

      // Validate base rate and deposit
      if (!formData.baseRate || formData.baseRate <= 0) {
        toast.error('Please enter a valid base rate');
        console.log("Validation failed: Invalid base rate");
        return;
      }

      // Make security deposit optional - allowing 0 or null values
      if (formData.securityDeposit !== null && formData.securityDeposit !== 0 && formData.securityDeposit < 0) {
        toast.error('Security deposit cannot be negative');
        console.log("Validation failed: Invalid security deposit");
        return;
      }

      // Validate terms acceptance
      if (!formData.termsAccepted) {
        toast.error('Please accept the terms and conditions');
        console.log("Validation failed: Terms not accepted");
        return;
      }

      // Format dates properly
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      // Ensure seconds and milliseconds are zeroed out
      startDate.setSeconds(0, 0);
      endDate.setSeconds(0, 0);

      // Get signature data if available
      const signatureData = signaturePadRef.current?.toDataURL();
      if (!signatureData) {
        toast.error('Please sign the booking form');
        console.log("Validation failed: Missing signature");
        return;
      }

      // Check for required document uploads
      const requiredDocs = ['photo', 'dl_front', 'dl_back', 'aadhar_front', 'aadhar_back'];
      const missingDocs = requiredDocs.filter(doc => !documents[doc as keyof Documents]);
      
      if (missingDocs.length > 0) {
        toast.error(`Please upload all required documents: ${missingDocs.join(', ').replace(/_/g, ' ')}`);
        console.log("Validation failed: Missing documents", missingDocs);
        return;
      }

      // Prepare booking data
      const bookingData: any = {
        vehicle_id: formData.vehicle_id,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        customer_details: {
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          dl_number: formData.dlNumber,
          dl_expiry: formData.dlExpiryDate?.toISOString(),
          dob: formData.dob?.toISOString(),
          aadhar_number: formData.aadhaarNumber
        },
        pricing: {
          base_price: parseFloat(formData.baseRate.toString()),
          security_deposit: formData.securityDeposit ? parseFloat(formData.securityDeposit.toString()) : 0,
          total_amount: calculateTotal()
        },
        payment_method: formData.payment_method,
        notes: formData.notes,
        documents: documents,
        signature: signatureData,
        terms_accepted: formData.termsAccepted
      };

      console.log('Submitting booking with data:', {
        vehicle_id: bookingData.vehicle_id,
        dates: {
          start: bookingData.start_date,
          end: bookingData.end_date
        },
        customer: bookingData.customer_details.full_name
      });

      setIsLoading(true);
      
      // Send the form data to the server
      if (typeof onSubmit === 'function') {
        const response = await onSubmit(bookingData);
        
        if (response && 'success' in response && !response.success) {
          throw new Error(response.error || 'Failed to submit booking');
        }
        
        toast.success('Booking submitted successfully');
        
        // Clear form or redirect as needed
        setTimeout(() => {
          router.push('/bookings');
        }, 1500);
      } else {
        console.error('onSubmit is not a function', onSubmit);
        throw new Error('Form submission handler is not properly configured');
      }
      
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit form');
      toast.error('Failed to submit booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : parseFloat(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCustomerDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: keyof Documents) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should not exceed 5MB');
        return;
      }
      setDocuments(prev => ({ ...prev, [type]: file }));
    }
  };

  const handleRemoveFile = (type: keyof Documents) => {
    setDocuments(prev => ({ ...prev, [type]: null }));
  };

  const handleSignatureClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setSignatureData(null);
    }
  };

  const handleSignatureSave = () => {
    if (signaturePadRef.current) {
      const signatureData = signaturePadRef.current.toDataURL();
      setDocuments(prev => ({ ...prev, signature: signatureData }));
    }
  };

  const searchCustomerByAadhar = async () => {
    try {
      if (!aadharNumber) {
        toast.error('Please enter Aadhar number');
        return;
      }

      const response = await fetch(`/api/customers/search?aadhar=${aadharNumber}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to search customer');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to find customer');
      }

      if (data.customers && data.customers.length > 0) {
        const customer = data.customers[0];
        setSelectedCustomer(customer);
        setFormData(prev => ({
          ...prev,
          selectedCustomerId: customer.id
        }));
        toast.success('Customer found');
      } else {
        toast.error('No customer found with this Aadhar number');
      }
    } catch (error) {
      console.error('Error searching customer:', error);
      toast.error('Failed to search customer. Please try again.');
    }
  };

  const handleStartDateChange = (date: Date | null) => {
    if (!date) return;
    
    // Create a new date object to avoid mutation
    const newDate = new Date(date);
    
    // If we're changing date only, preserve the time from current start_date
    if (formData.start_date) {
      const hours = formData.start_date.getHours();
      const minutes = formData.start_date.getMinutes();
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
    } else {
      // Default to 10:00 AM if no time was previously set
      newDate.setHours(10);
      newDate.setMinutes(0);
    }
    
    // Always reset seconds and milliseconds
    newDate.setSeconds(0, 0);
    
    setFormData(prev => ({
      ...prev,
      start_date: newDate,
      // If end date is before new start date, update end date too
      end_date: prev.end_date && prev.end_date < newDate 
        ? addDays(new Date(newDate), 1) 
        : prev.end_date
    }));
    
    console.log('Updated start date:', newDate.toISOString());
  };

  const handleEndDateChange = (date: Date | null) => {
    if (!date) return;
    
    // Create a new date object to avoid mutation
    const newDate = new Date(date);
    
    // If we're changing date only, preserve the time from current end_date
    if (formData.end_date) {
      const hours = formData.end_date.getHours();
      const minutes = formData.end_date.getMinutes();
      newDate.setHours(hours);
      newDate.setMinutes(minutes);
    } else {
      // Default to 10:00 AM if no time was previously set
      newDate.setHours(10);
      newDate.setMinutes(0);
    }
    
    // Always reset seconds and milliseconds
    newDate.setSeconds(0, 0);
    
    setFormData(prev => ({
      ...prev,
      end_date: newDate
    }));
    
    console.log('Updated end date:', newDate.toISOString());
  };

  // Calculate total amount
  const calculateTotal = () => {
    const base = formData.baseRate || 0;
    const deposit = formData.securityDeposit || 0;
    return base + deposit;
  };

  const handleDateChange = (date: Date | null, field: 'dob' | 'dl_expiry') => {
    setCustomerDetails(prev => ({
      ...prev,
      [field]: date
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-5xl mx-auto bg-white shadow rounded border">
      {/* Customer Details Section */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900">Customer Details</h3>
            <p className="text-xs text-gray-500">Personal information</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                required
                placeholder="Enter full name"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                placeholder="Enter email address"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                required
                placeholder="Enter phone number"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DatePicker
                  selected={formData.dob}
                  onChange={(date) => setFormData({...formData, dob: date})}
                  dateFormat="dd/MM/yyyy"
                  showYearDropdown
                  scrollableYearDropdown
                  yearDropdownItemNumber={80}
                  maxDate={new Date()}
                  placeholderText="Select date of birth"
                  className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
                  showPopperArrow={false}
                  calendarClassName="shadow-lg rounded-md border-0"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                DL Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="dlNumber"
                value={formData.dlNumber}
                onChange={handleInputChange}
                required
                placeholder="Enter driving license number"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                DL Expiry Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DatePicker
                  selected={formData.dlExpiryDate}
                  onChange={(date) => setFormData({...formData, dlExpiryDate: date})}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="Select expiry date"
                  minDate={new Date()}
                  className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
                  showPopperArrow={false}
                  calendarClassName="shadow-lg rounded-md border-0"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Aadhaar Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="aadhaarNumber"
                value={formData.aadhaarNumber}
                onChange={handleInputChange}
                required
                placeholder="Enter Aadhaar number"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                placeholder="Enter full address"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                required
                placeholder="Enter city"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleInputChange}
                required
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="">Select state</option>
                <option value="AP">Andhra Pradesh</option>
                <option value="AR">Arunachal Pradesh</option>
                <option value="AS">Assam</option>
                <option value="BR">Bihar</option>
                <option value="CT">Chhattisgarh</option>
                <option value="GA">Goa</option>
                <option value="GJ">Gujarat</option>
                <option value="HR">Haryana</option>
                <option value="HP">Himachal Pradesh</option>
                <option value="JK">Jammu and Kashmir</option>
                <option value="JH">Jharkhand</option>
                <option value="KA">Karnataka</option>
                <option value="KL">Kerala</option>
                <option value="MP">Madhya Pradesh</option>
                <option value="MH">Maharashtra</option>
                <option value="MN">Manipur</option>
                <option value="ML">Meghalaya</option>
                <option value="MZ">Mizoram</option>
                <option value="NL">Nagaland</option>
                <option value="OR">Odisha</option>
                <option value="PB">Punjab</option>
                <option value="RJ">Rajasthan</option>
                <option value="SK">Sikkim</option>
                <option value="TN">Tamil Nadu</option>
                <option value="TG">Telangana</option>
                <option value="TR">Tripura</option>
                <option value="UT">Uttarakhand</option>
                <option value="UP">Uttar Pradesh</option>
                <option value="WB">West Bengal</option>
                <option value="AN">Andaman and Nicobar Islands</option>
                <option value="CH">Chandigarh</option>
                <option value="DN">Dadra and Nagar Haveli</option>
                <option value="DD">Daman and Diu</option>
                <option value="DL">Delhi</option>
                <option value="LD">Lakshadweep</option>
                <option value="PY">Puducherry</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Pin Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleInputChange}
                required
                placeholder="Enter pin code"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle and Pricing Section */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900">Vehicle & Pricing</h3>
            <p className="text-xs text-gray-500">Select vehicle and view pricing details</p>
          </div>
          
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vehicle <span className="text-red-500">*</span>
            </label>
            <select
              name="vehicle_id"
              value={formData.vehicle_id}
              onChange={handleInputChange}
              required
              disabled={isLoading}
              className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
            >
              <option value="">{isLoading ? 'Loading vehicles...' : 'Select a vehicle'}</option>
              {!isLoading && vehicles.length === 0 ? (
                <option value="" disabled className="text-red-500">No vehicles available in the system. Please add vehicles first.</option>
              ) : (
                vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id.toString()}>
                    {vehicle.make || vehicle.manufacturer} {vehicle.model} - {vehicle.number_plate}
                  </option>
                ))
              )}
            </select>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Vehicle Details
              </label>
              <input
                type="text"
                value={selectedVehicle ? `${selectedVehicle.make || selectedVehicle.manufacturer || ''} ${selectedVehicle.model} - ${selectedVehicle.number_plate}` : ""}
                readOnly
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm bg-gray-50 text-sm"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Base Rate (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="baseRate"
                value={formData.baseRate}
                onChange={handleInputChange}
                required
                placeholder="0.00"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Security Deposit (₹)
              </label>
              <input
                type="number"
                name="securityDeposit"
                value={formData.securityDeposit}
                onChange={handleInputChange}
                placeholder="0.00"
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Total Amount (₹)
              </label>
              <input
                type="number"
                value={calculateTotal()}
                readOnly
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm bg-gray-50 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Date and Time Section - Enhanced UI */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Rental Period</h3>
            <p className="text-xs text-gray-500">Select start and end dates and times</p>
          </div>
          
          <div className="space-y-5">
            {/* Start Date and Time */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DatePicker
                    selected={formData.start_date}
                    onChange={handleStartDateChange}
                    selectsStart
                    startDate={formData.start_date}
                    endDate={formData.end_date}
                    minDate={new Date()}
                    placeholderText="Select start date"
                    dateFormat="dd/MM/yyyy"
                    className="block w-full py-2 px-3 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
                    showPopperArrow={false}
                    calendarClassName="shadow-lg rounded-md border-0"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time <span className="text-red-500">*</span>
                </label>
                <TimeSelector
                  selected={formData.start_date}
                  onChange={(date) => {
                    // Create a new date to ensure we don't mutate the original
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
            
            {/* End Date and Time */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DatePicker
                    selected={formData.end_date}
                    onChange={handleEndDateChange}
                    selectsEnd
                    startDate={formData.start_date}
                    endDate={formData.end_date}
                    minDate={formData.start_date || new Date()}
                    placeholderText="Select end date"
                    dateFormat="dd/MM/yyyy"
                    className="block w-full py-2 px-3 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
                    showPopperArrow={false}
                    calendarClassName="shadow-lg rounded-md border-0"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time <span className="text-red-500">*</span>
                </label>
                <TimeSelector
                  selected={formData.end_date}
                  onChange={(date) => {
                    // Create a new date to ensure we don't mutate the original
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
          
            {/* Rental Duration Display (Optional enhancement) */}
            {formData.start_date && formData.end_date && (
              <div className="mt-2 bg-orange-50 border border-orange-100 rounded-md p-3">
                <p className="text-sm text-orange-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Rental duration: {Math.ceil((formData.end_date.getTime() - formData.start_date.getTime()) / (1000 * 60 * 60 * 24))} days
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Notes & Payment Section */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900">Notes & Payment</h3>
            <p className="text-xs text-gray-500">Additional information</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={2}
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
                placeholder="Enter any additional notes or special requirements"
              ></textarea>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleInputChange}
                required
                className="block w-full py-1.5 px-2 border border-gray-300 rounded shadow-sm focus:ring-orange-500 focus:border-orange-500 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="netbanking">Net Banking</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900">Document Upload</h3>
            <p className="text-xs text-gray-500">Upload required identity documents</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Photo ID <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                name="photoID"
                onChange={(e) => handleFileChange(e, 'photo')}
                accept="image/*"
                required
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-2.5 file:text-xs file:font-medium file:border-0 file:rounded file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 border border-gray-300 rounded shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                DL Front <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                name="dlFront"
                onChange={(e) => handleFileChange(e, 'dl_front')}
                accept="image/*"
                required
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-2.5 file:text-xs file:font-medium file:border-0 file:rounded file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 border border-gray-300 rounded shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                DL Back <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                name="dlBack"
                onChange={(e) => handleFileChange(e, 'dl_back')}
                accept="image/*"
                required
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-2.5 file:text-xs file:font-medium file:border-0 file:rounded file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 border border-gray-300 rounded shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Aadhaar Front <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                name="aadhaarFront"
                onChange={(e) => handleFileChange(e, 'aadhar_front')}
                accept="image/*"
                required
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-2.5 file:text-xs file:font-medium file:border-0 file:rounded file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 border border-gray-300 rounded shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Aadhaar Back <span className="text-red-500">*</span>
              </label>
              <input
                type="file"
                name="aadhaarBack"
                onChange={(e) => handleFileChange(e, 'aadhar_back')}
                accept="image/*"
                required
                className="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-2.5 file:text-xs file:font-medium file:border-0 file:rounded file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 border border-gray-300 rounded shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions Section */}
      <div className="border-b border-gray-200">
        <div className="p-4">
          <div className="mb-3">
            <h3 className="text-base font-semibold text-gray-900">Terms & Conditions</h3>
            <p className="text-xs text-gray-500">Review and accept rental terms</p>
          </div>
          
          <div className="h-24 overflow-y-auto p-2 mb-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
            <p>1. Renter must be at least 18 years old with a valid driving license.</p>
            <p>2. Security deposit (if applicable) is refundable subject to vehicle condition upon return.</p>
            <p>3. Fuel expenses are to be borne by the renter.</p>
            <p>4. Renter is responsible for any traffic violations or fines during the rental period.</p>
            <p>5. Vehicle must be returned in the same condition as received.</p>
            <p>6. Late returns will incur additional charges at hourly rates.</p>
            <p>7. Cancellation policy: 100% refund if canceled 24 hours before pickup, 50% refund if canceled 12 hours before pickup, no refund for cancellations within 12 hours of pickup.</p>
            <p>8. The company is not responsible for any accidents or damages to the renter or third parties.</p>
            <p>9. Helmet is provided and must be worn at all times while riding.</p>
            <p>10. Vehicle must not be taken outside the city limits without prior permission.</p>
          </div>
          
          <div className="mb-3">
            <label className="flex items-start text-sm">
              <input
                type="checkbox"
                name="termsAccepted"
                checked={formData.termsAccepted}
                onChange={(e) => setFormData(prev => ({...prev, termsAccepted: e.target.checked}))}
                required
                className="mt-0.5 h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-xs">
                I have read and agree to the terms and conditions of the rental agreement
                <span className="text-red-500"> *</span>
              </span>
            </label>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Signature <span className="text-red-500">*</span>
            </label>
            <div className="border border-gray-300 rounded h-24 bg-white shadow-sm">
              <SignaturePad
                ref={signaturePadRef}
                canvasProps={{
                  className: 'signature-canvas w-full h-24'
                }}
              />
            </div>
            <div className="mt-1 flex justify-end">
              <button
                type="button"
                onClick={handleSignatureClear}
                className="text-xs text-gray-600 hover:text-gray-800"
              >
                Clear Signature
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="p-4 flex justify-end space-x-2">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="py-1.5 px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="py-1.5 px-4 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : (
            "Submit Booking"
          )}
        </button>
      </div>
    </form>
  );
}
