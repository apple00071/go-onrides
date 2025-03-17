"use client";

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import dynamic from 'next/dynamic';
import { v4 as uuidv4 } from 'uuid';
import type SignatureCanvas from 'react-signature-canvas';

// Dynamically import SignatureCanvas with no SSR to prevent hydration issues
const SignaturePad = dynamic<any>(
  () => import('react-signature-canvas'),
  { ssr: false }
);

// Form validation schema
const formSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  // Remove the validation for dates when initializing to avoid hydration mismatches
  startDate: z.string(),
  endDate: z.string(),
  bikeType: z.enum(["mountain", "road", "hybrid", "electric", "other"], {
    errorMap: () => ({ message: "Please select a bike type" }),
  }),
  agreementAccepted: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type FormValues = z.infer<typeof formSchema>;

// Create a more specific type for our signature canvas reference
type SignatureCanvasRef = SignatureCanvas & {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: (type: string, encoderOptions?: number) => string;
};

const BikeRentalForm = () => {
  const [signatureURL, setSignatureURL] = useState<string | null>(null);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const sigCanvas = useRef<SignatureCanvasRef | null>(null);

  // Set mounted state
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      startDate: '',
      endDate: '',
      bikeType: 'mountain',
      agreementAccepted: false,
    },
  });

  // Add resize observer to handle canvas sizing
  useEffect(() => {
    if (!isMounted) return;
    
    if (sigCanvas.current) {
      const canvasElement = sigCanvas.current;
      
      // Force canvas to clear and resize properly on component mount
      setTimeout(() => {
        if (canvasElement) {
          canvasElement.clear();
          
          // Canvas sizing will be handled by CSS instead of direct manipulation
        }
      }, 100);
    }
  }, [isMounted]);

  const handleClearSignature = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear();
      setSignatureURL(null);
      setIsSignatureEmpty(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  // Enhanced function to detect signature
  const onBeginDrawing = () => {
    // Set flag when user starts drawing
    if (sigCanvas.current) {
      console.log("Begin drawing signature");
    }
  };

  const onEndDrawing = () => {
    if (sigCanvas.current) {
      // Short delay to ensure the canvas has been updated
      setTimeout(() => {
        const isEmpty = sigCanvas.current?.isEmpty() || false;
        console.log("Signature is empty:", isEmpty);
        setIsSignatureEmpty(isEmpty);
        
        if (!isEmpty) {
          const dataURL = sigCanvas.current?.toDataURL('image/png');
          console.log("Signature captured");
          setSignatureURL(dataURL || null);
        }
      }, 50);
    }
  };

  const onSubmit = async (data: FormValues) => {
    // Client-side validation for dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (startDate < today) {
      alert("Start date must be today or in the future");
      return;
    }
    
    if (endDate < today) {
      alert("End date must be today or in the future");
      return;
    }
    
    if (isSignatureEmpty) {
      alert("Please sign the form before submitting");
      return;
    }

    if (!uploadedFile) {
      alert("Please upload the required document");
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real application, you would send this data to your server
      // This is just a simulation of the submission process
      const formData = new FormData();
      
      // Append form fields
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      
      // Append signature
      if (signatureURL) {
        // Convert data URL to blob
        const blob = await (await fetch(signatureURL)).blob();
        formData.append('signature', blob, 'signature.png');
      }
      
      // Append file
      if (uploadedFile) {
        formData.append('document', uploadedFile);
      }

      // Add a unique ID for this rental
      const rentalId = uuidv4();
      formData.append('rentalId', rentalId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Form submitted successfully', {
        ...data,
        signatureProvided: !!signatureURL,
        documentUploaded: !!uploadedFile,
        rentalId
      });
      
      // Reset form
      reset();
      handleClearSignature();
      setUploadedFile(null);
      setFormSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('There was an error submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Conditional rendering for the signature pad
  const renderSignaturePad = () => {
    if (!isMounted) {
      return (
        <div className="border rounded border-gray-300 mb-2 flex items-center justify-center" style={{ height: '200px' }}>
          <p className="text-gray-500">Signature pad loading...</p>
        </div>
      );
    }
    
    return (
      <div className="border rounded border-gray-300 mb-2 relative" style={{ height: '200px', touchAction: 'none' }}>
        <SignaturePad
          canvasProps={{
            width: '100%',
            height: '200px',
            className: 'signature-canvas',
            style: { 
              width: '100%', 
              height: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              touchAction: 'none'
            }
          }}
          ref={(ref: SignatureCanvasRef | null) => {
            sigCanvas.current = ref;
          }}
          onBegin={onBeginDrawing}
          onEnd={onEndDrawing}
          backgroundColor="rgba(255, 255, 255, 0)"
          penColor="black"
        />
      </div>
    );
  };

  if (formSubmitted) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-green-600 mb-4">Rental Form Submitted Successfully!</h2>
        <p className="mb-4">Thank you for your bike rental request. We have received your information and will process it shortly.</p>
        <p className="mb-6">You will receive a confirmation email with your rental details.</p>
        <button
          type="button"
          onClick={() => setFormSubmitted(false)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Rent Another Bike
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-3xl font-bold text-center mb-6 text-blue-600">Bike Rental Form</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              {...register('firstName')}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              {...register('lastName')}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              {...register('phone')}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            id="address"
            type="text"
            {...register('address')}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              {...register('startDate')}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.startDate && (
              <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              {...register('endDate')}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.endDate && (
              <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="bikeType" className="block text-sm font-medium text-gray-700 mb-1">
            Bike Type
          </label>
          <select
            id="bikeType"
            {...register('bikeType')}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="mountain">Mountain Bike</option>
            <option value="road">Road Bike</option>
            <option value="hybrid">Hybrid Bike</option>
            <option value="electric">Electric Bike</option>
            <option value="other">Other</option>
          </select>
          {errors.bikeType && (
            <p className="mt-1 text-sm text-red-600">{errors.bikeType.message}</p>
          )}
        </div>

        <div className="border rounded-md p-4">
          <h3 className="text-lg font-medium mb-2">Digital Signature</h3>
          <p className="text-sm text-gray-600 mb-4">Please sign in the box below using your mouse or touch screen.</p>
          
          {renderSignaturePad()}
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={handleClearSignature}
              className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={!isMounted}
            >
              Clear Signature
            </button>
            {!isSignatureEmpty && (
              <span className="px-4 py-2 text-green-600 font-medium">
                ✓ Signature captured
              </span>
            )}
          </div>
        </div>

        <div className="border rounded-md p-4">
          <h3 className="text-lg font-medium mb-2">Document Upload</h3>
          <p className="text-sm text-gray-600 mb-4">
            Please upload a copy of your ID or driver's license.
          </p>
          
          <input
            type="file"
            id="documentUpload"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
            accept=".pdf,.jpg,.jpeg,.png"
          />
          {uploadedFile && (
            <p className="mt-2 text-sm text-green-600">
              File uploaded: {uploadedFile.name}
            </p>
          )}
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              id="agreementAccepted"
              type="checkbox"
              {...register('agreementAccepted')}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor="agreementAccepted" className="font-medium text-gray-700">
              I agree to the terms and conditions
            </label>
            <p className="text-gray-500">
              By checking this box, you agree to our{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
              .
            </p>
            {errors.agreementAccepted && (
              <p className="mt-1 text-sm text-red-600">{errors.agreementAccepted.message}</p>
            )}
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-3 px-4 rounded-md text-white font-medium ${
              isSubmitting
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rental Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BikeRentalForm; 