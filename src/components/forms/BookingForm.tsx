'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';
import SignaturePad from 'react-signature-canvas';
import { toast } from 'react-hot-toast';

interface Vehicle {
  id: number;
  model: string;
  type: string;
  number_plate: string;
  status: string;
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface BookingFormProps {
  role: 'admin' | 'worker';
  onSubmit?: (data: any) => void;
  onCancel?: () => void;
  initialData?: any;
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

interface FormDataWithDateTime {
  customer_id: string;
  vehicle_id: string;
  start_date: DateTimeValue;
  end_date: DateTimeValue;
  base_price: string;
  additional_charges: string;
  discount: string;
  notes: string;
}

export default function BookingForm({ role, onSubmit, onCancel, initialData }: BookingFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<CustomerWithDetails[]>([]);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const signaturePadRef = useRef<any>(null);
  
  const [formData, setFormData] = useState({
    customer_id: initialData?.customer_id || '',
    vehicle_id: initialData?.vehicle_id || '',
    start_date: {
      date: initialData?.start_date ? new Date(initialData.start_date).toISOString().split('T')[0] : '',
      time: initialData?.start_date ? new Date(initialData.start_date).toTimeString().slice(0, 5) : ''
    },
    end_date: {
      date: initialData?.end_date ? new Date(initialData.end_date).toISOString().split('T')[0] : '',
      time: initialData?.end_date ? new Date(initialData.end_date).toTimeString().slice(0, 5) : ''
    },
    base_price: initialData?.base_price || '',
    additional_charges: initialData?.additional_charges || '0',
    discount: initialData?.discount || '0',
    notes: initialData?.notes || ''
  });

  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    dl_number: '',
    aadhar_number: '',
    father_phone: '',
    mother_phone: '',
    emergency_contact1: '',
    emergency_contact2: '',
    photo: null,
    dl_front: null,
    dl_back: null,
    aadhar_front: null,
    aadhar_back: null,
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

  useEffect(() => {
    fetchVehiclesAndCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchTerm, searchBy, customers]);

  useEffect(() => {
    if (formData.vehicle_id) {
      const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
      setSelectedVehicle(vehicle || null);
    }
  }, [formData.vehicle_id, vehicles]);

  const filterCustomers = () => {
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
  };

  const fetchVehiclesAndCustomers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch available vehicles
      const vehiclesResponse = await fetch('/api/vehicles?status=available', {
        credentials: 'include'
      });
      if (!vehiclesResponse.ok) {
        throw new Error('Failed to fetch vehicles');
      }
      const vehiclesData = await vehiclesResponse.json();
      setVehicles(vehiclesData.vehicles || []);

      // Fetch customers
      const customersResponse = await fetch('/api/customers', {
        credentials: 'include'
      });
      if (!customersResponse.ok) {
        throw new Error('Failed to fetch customers');
      }
      const customersData = await customersResponse.json();
      setCustomers(customersData.customers || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      // Validate required fields
      if (!formData.vehicle_id) {
        toast.error('Please select a vehicle');
        return;
      }

      if (!isNewCustomer && !formData.customer_id && !selectedCustomer) {
        toast.error('Please search and select an existing customer');
        return;
      }

      // Combine date and time for start and end dates
      const combinedStartDate = new Date(`${formData.start_date.date}T${formData.start_date.time}`);
      const combinedEndDate = new Date(`${formData.end_date.date}T${formData.end_date.time}`);

      // Validate dates
      if (isNaN(combinedStartDate.getTime()) || isNaN(combinedEndDate.getTime())) {
        toast.error('Please select valid dates and times');
        return;
      }

      if (combinedEndDate <= combinedStartDate) {
        toast.error('End date must be after start date');
        return;
      }

      // Get signature data if available
      const signatureData = signaturePadRef.current?.toDataURL();

      // Prepare base booking data
      const bookingData: any = {
        vehicle_id: formData.vehicle_id,
        start_date: combinedStartDate.toISOString(),
        end_date: combinedEndDate.toISOString(),
        base_price: parseFloat(formData.base_price) || 0,
        additional_charges: parseFloat(formData.additional_charges) || 0,
        discount: parseFloat(formData.discount) || 0,
        notes: formData.notes,
        signature: signatureData
      };

      // Handle new customer case
      if (isNewCustomer) {
        // Validate required fields for new customer
        const requiredFields = ['first_name', 'last_name', 'phone', 'email', 'address', 'city', 'state', 'pincode', 'dl_number', 'aadhar_number'];
        const missingFields = requiredFields.filter(field => !customerDetails[field as keyof CustomerDetails]);
        
        if (missingFields.length > 0) {
          toast.error(`Please fill in all required customer fields: ${missingFields.join(', ')}`);
          return;
        }

        // Validate required documents for new customer
        const requiredDocs = ['photo', 'dl_front', 'dl_back', 'aadhar_front', 'aadhar_back'];
        const missingDocs = requiredDocs.filter(doc => !documents[doc as keyof Documents]);
        
        if (missingDocs.length > 0) {
          toast.error(`Please upload all required documents: ${missingDocs.join(', ')}`);
          return;
        }

        if (!signatureData) {
          toast.error('Please add customer signature');
          return;
        }

        bookingData.customer_details = customerDetails;
        bookingData.documents = documents;
        bookingData.is_new_customer = true;
      } else {
        // For existing customer
        if (!selectedCustomer) {
          toast.error('Please select a customer');
          return;
        }
        
        bookingData.customer_id = selectedCustomer.id;
        bookingData.is_new_customer = false;

        // Add any updated documents if provided
        const updatedDocs: Partial<Documents> = {};
        let hasUpdatedDocs = false;

        Object.entries(documents).forEach(([key, value]) => {
          if (value) {
            updatedDocs[key as keyof Documents] = value;
            hasUpdatedDocs = true;
          }
        });

        if (hasUpdatedDocs) {
          bookingData.documents = updatedDocs;
        }
      }

      // Validate terms acceptance
      if (!acceptedTerms) {
        toast.error('Please accept the terms and conditions');
        return;
      }

      setIsLoading(true);
      await onSubmit?.(bookingData);
      toast.success('Booking submitted successfully');
    } catch (error) {
      console.error('Error submitting form:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit form');
      toast.error('Failed to submit booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
          customer_id: customer.id
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

  const handleDateTimeChange = (field: 'start_date' | 'end_date', type: 'date' | 'time', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [type]: value
      }
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
    <div className="max-w-5xl mx-auto bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
      <form onSubmit={handleSubmit} className="divide-y divide-gray-100">
        {error && (
          <div className="p-4">
            <ErrorAlert message={error} />
          </div>
        )}

        {/* Customer Section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Customer Details</h3>
              <p className="mt-1 text-sm text-gray-500">Enter customer information for the booking</p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsNewCustomer(false)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  !isNewCustomer 
                    ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-700/10' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                Existing Customer
              </button>
              <button
                type="button"
                onClick={() => setIsNewCustomer(true)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isNewCustomer 
                    ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-700/10' 
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                New Customer
              </button>
            </div>
          </div>

          {!isNewCustomer ? (
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="flex-grow">
                  <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Search by Aadhar Number
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      id="aadhar_number"
                      value={aadharNumber}
                      onChange={(e) => setAadharNumber(e.target.value)}
                      className="flex-grow rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                      placeholder="Enter Aadhar number"
                    />
                    <button
                      type="button"
                      onClick={searchCustomerByAadhar}
                      disabled={isLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Searching...
                        </>
                      ) : (
                        'Search'
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {selectedCustomer && (
                <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Found</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{selectedCustomer.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    id="first_name"
                    required
                    value={customerDetails.first_name}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    value={customerDetails.email}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    id="address"
                    required
                    value={customerDetails.address}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    id="city"
                    required
                    value={customerDetails.city}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="dl_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Driving License Number
                  </label>
                  <input
                    type="text"
                    name="dl_number"
                    id="dl_number"
                    required
                    value={customerDetails.dl_number}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="father_phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Father's Phone
                  </label>
                  <input
                    type="tel"
                    name="father_phone"
                    id="father_phone"
                    required
                    value={customerDetails.father_phone}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="emergency_contact1" className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact 1
                  </label>
                  <input
                    type="tel"
                    name="emergency_contact1"
                    id="emergency_contact1"
                    required
                    value={customerDetails.emergency_contact1}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    id="last_name"
                    required
                    value={customerDetails.last_name}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    required
                    value={customerDetails.phone}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="state"
                    id="state"
                    required
                    value={customerDetails.state}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    id="pincode"
                    required
                    value={customerDetails.pincode}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="aadhar_number" className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Number
                  </label>
                  <input
                    type="text"
                    name="aadhar_number"
                    id="aadhar_number"
                    required
                    value={customerDetails.aadhar_number}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="mother_phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Mother's Phone
                  </label>
                  <input
                    type="tel"
                    name="mother_phone"
                    id="mother_phone"
                    required
                    value={customerDetails.mother_phone}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="emergency_contact2" className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact 2
                  </label>
                  <input
                    type="tel"
                    name="emergency_contact2"
                    id="emergency_contact2"
                    required
                    value={customerDetails.emergency_contact2}
                    onChange={handleCustomerDetailsChange}
                    className="w-full rounded-lg border-gray-300 focus:ring-orange-500 focus:border-orange-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rest of the booking form */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Vehicle Selection */}
          <div>
            <label htmlFor="vehicle_id" className="block text-sm font-medium text-gray-700">
              Vehicle
            </label>
            <select
              id="vehicle_id"
              name="vehicle_id"
              value={formData.vehicle_id}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md"
            >
              <option value="">Select a vehicle</option>
              {vehicles.map(vehicle => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.model} - {vehicle.number_plate}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 p-6">
            {/* Start Date and Time */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Start Date & Time</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date.date}
                    onChange={(e) => handleDateTimeChange('start_date', 'date', e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    id="start_time"
                    value={formData.start_date.time}
                    onChange={(e) => handleDateTimeChange('start_date', 'time', e.target.value)}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* End Date and Time */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-900">End Date & Time</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    id="end_date"
                    value={formData.end_date.date}
                    onChange={(e) => handleDateTimeChange('end_date', 'date', e.target.value)}
                    min={formData.start_date.date || new Date().toISOString().split('T')[0]}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-1">
                    Time
                  </label>
                  <input
                    type="time"
                    id="end_time"
                    value={formData.end_date.time}
                    onChange={(e) => handleDateTimeChange('end_date', 'time', e.target.value)}
                    required
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Base Price */}
          <div>
            <label htmlFor="base_price" className="block text-sm font-medium text-gray-700">
              Base Price
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">₹</span>
              </div>
              <input
                type="number"
                name="base_price"
                id="base_price"
                value={formData.base_price}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full pl-7 pr-12 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Additional Charges - Only shown for admin */}
          {role === 'admin' && (
            <div>
              <label htmlFor="additional_charges" className="block text-sm font-medium text-gray-700">
                Additional Charges
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="additional_charges"
                  id="additional_charges"
                  value={formData.additional_charges}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full pl-7 pr-12 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
              </div>
            </div>
          )}

          {/* Discount - Only shown for admin */}
          {role === 'admin' && (
            <div>
              <label htmlFor="discount" className="block text-sm font-medium text-gray-700">
                Discount
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">₹</span>
                </div>
                <input
                  type="number"
                  name="discount"
                  id="discount"
                  value={formData.discount}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full pl-7 pr-12 border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="col-span-2">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={3}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
          />
        </div>

        {/* Signature Section */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Signature</h4>
          <div className="border rounded-lg p-4">
            <SignaturePad
              ref={signaturePadRef}
              canvasProps={{
                className: 'signature-canvas w-full h-40 border rounded',
              }}
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={handleSignatureClear}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Document Upload Section - Only show all required fields for new customers */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Documents</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isNewCustomer ? (
              // Show all required document uploads for new customers
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Photo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'photo')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DL Front <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'dl_front')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DL Back <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'dl_back')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Front <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'aadhar_front')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aadhar Back <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'aadhar_back')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    required
                  />
                </div>
              </>
            ) : (
              // Show optional document uploads for existing customers
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update Photo (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'photo')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update DL Front (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'dl_front')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update DL Back (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'dl_back')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update Aadhar Front (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'aadhar_front')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update Aadhar Back (Optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'aadhar_back')}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Terms & Conditions Section */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Terms & Conditions</h3>
            <p className="mt-1 text-sm text-gray-500">Please read and accept our terms and conditions</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="h-48 overflow-y-auto prose prose-sm max-w-none mb-4">
              <h4>Vehicle Rental Agreement Terms</h4>
              <ol className="list-decimal pl-4 space-y-2">
                <li>The renter must be at least 21 years old and possess a valid driving license.</li>
                <li>The vehicle must be returned with the same amount of fuel as at the time of pickup.</li>
                <li>The renter is responsible for any traffic violations, fines, or penalties incurred during the rental period.</li>
                <li>The vehicle should not be used for any illegal activities or purposes not specified in the agreement.</li>
                <li>The renter must report any accidents or damage to the vehicle immediately.</li>
                <li>Insurance coverage is subject to the terms specified in the rental agreement.</li>
                <li>Late returns will incur additional charges as specified in the rental agreement.</li>
                <li>The vehicle should not be taken outside the specified geographical boundaries without prior permission.</li>
                <li>Smoking is strictly prohibited inside the vehicle.</li>
              </ol>
            </div>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the terms and conditions. I understand that by checking this box, I am giving my consent to be bound by these terms.
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!acceptedTerms || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Booking'
            )}
          </button>
        </div>
      </form>
    </div>
  );
} 