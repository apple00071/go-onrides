import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const getStatusColor = (status: string | null | undefined) => {
  if (!status) return 'bg-gray-100 text-gray-800';
  
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
  
  try {
    return colors[status.toLowerCase() as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  } catch (error) {
    console.error("Error getting status color:", error);
    return 'bg-gray-100 text-gray-800';
  }
};

export function getInitials(name: string | null | undefined): string {
  if (!name) return '';
  
  try {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  } catch (error) {
    console.error("Error getting initials:", error);
    return '';
  }
}

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) return 'N/A';
  
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  } catch (error) {
    console.error("Error formatting currency:", error);
    return 'Invalid Amount';
  }
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(typeof date === 'string' ? new Date(date) : date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return 'Invalid Date';
  }
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