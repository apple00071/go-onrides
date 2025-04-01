import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStatusColor = (status: string) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    overdue: 'bg-orange-100 text-orange-800',
    available: 'bg-green-100 text-green-800',
    rented: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-yellow-100 text-yellow-800',
    retired: 'bg-gray-100 text-gray-800'
  };
  return colors[status.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
};

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

/**
 * Transforms customer data to fit database schema requirements
 * This helps handle discrepancies between UI form data and database schema
 */
export const transformCustomerData = (customerDetails: any) => {
  // If the data already has full_name, use it
  if (customerDetails.full_name) {
    return customerDetails;
  }
  
  // If we have first_name and last_name, combine them
  if (customerDetails.first_name && customerDetails.last_name) {
    return {
      ...customerDetails,
      full_name: `${customerDetails.first_name} ${customerDetails.last_name}`.trim()
    };
  }
  
  // If we have fullName, use it as full_name
  if (customerDetails.fullName) {
    return {
      ...customerDetails,
      full_name: customerDetails.fullName,
    };
  }
  
  // Default case - just return the original data
  return customerDetails;
}; 