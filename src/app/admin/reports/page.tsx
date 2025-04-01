'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorAlert from '@/components/ui/ErrorAlert';

interface ReportData {
  totalRevenue: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  vehicleUtilization: {
    total: number;
    rented: number;
    available: number;
    maintenance: number;
  };
  revenueByVehicleType: {
    [key: string]: number;
  };
  monthlyRevenue: {
    month: string;
    revenue: number;
  }[];
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('last30days');

  const fetchReportData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Use regular API with date range filtering, default is to use real data
      const endpoint = `/api/reports?range=${dateRange}`;
      
      console.log(`Fetching report data from ${endpoint}`);
      
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      // Log the response status and headers for debugging
      console.log('Response status:', response.status);
      console.log('Response headers:', {
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        throw new Error(`Failed to fetch report data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received data:', data);
      setReportData(data);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDownloadReport = () => {
    if (!reportData) return;
    
    // Convert the data to CSV format
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Add report metadata
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    csvContent += `Report Generated: ${currentDate}\n`;
    csvContent += `Date Range: ${dateRange}\n\n`;
    
    // Add headers
    csvContent += "Metric,Value\n";
    
    // Add data
    csvContent += `Total Revenue,${reportData.totalRevenue}\n`;
    csvContent += `Total Bookings,${reportData.totalBookings}\n`;
    csvContent += `Active Bookings,${reportData.activeBookings}\n`;
    csvContent += `Completed Bookings,${reportData.completedBookings}\n`;
    csvContent += `Cancelled Bookings,${reportData.cancelledBookings}\n`;
    
    // Vehicle utilization
    csvContent += `Total Vehicles,${reportData.vehicleUtilization.total}\n`;
    csvContent += `Rented Vehicles,${reportData.vehicleUtilization.rented}\n`;
    csvContent += `Available Vehicles,${reportData.vehicleUtilization.available}\n`;
    csvContent += `Maintenance Vehicles,${reportData.vehicleUtilization.maintenance}\n`;
    
    // Revenue by vehicle type
    csvContent += "\nVehicle Type,Revenue\n";
    Object.entries(reportData.revenueByVehicleType).forEach(([type, revenue]) => {
      csvContent += `${type.charAt(0).toUpperCase() + type.slice(1)},${revenue}\n`;
    });
    
    // Monthly revenue
    csvContent += "\nMonth,Revenue\n";
    reportData.monthlyRevenue.forEach((month) => {
      const formattedMonth = new Date(month.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      csvContent += `${formattedMonth},${month.revenue}\n`;
    });
    
    // Create a download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    // Create a more descriptive filename with date range
    let fileName = "report_";
    switch (dateRange) {
      case 'today':
        fileName += "today_";
        break;
      case 'last7days':
        fileName += "last_7_days_";
        break;
      case 'last30days':
        fileName += "last_30_days_";
        break;
      case 'thisMonth':
        fileName += "this_month_";
        break;
      case 'lastMonth':
        fileName += "last_month_";
        break;
      case 'thisYear':
        fileName += "this_year_";
        break;
      default:
        fileName += dateRange + "_";
    }
    fileName += new Date().toISOString().split('T')[0] + ".csv";
    
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    
    // Trigger download
    link.click();
    
    // Clean up
    document.body.removeChild(link);
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
          <h1 className="text-2xl font-semibold text-gray-900">Reports & Analytics</h1>
          <p className="mt-2 text-sm text-gray-700">
            View detailed reports and analytics about your business
          </p>
        </div>
        <div className="mt-4 sm:mt-0 space-y-2">
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              // Trigger data fetch when date range changes
              setTimeout(() => fetchReportData(), 100);
            }}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
          >
            <option value="today">Today</option>
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisYear">This Year</option>
          </select>
          
          <div className="flex justify-between space-x-2">
            <button
              onClick={handleDownloadReport}
              disabled={!reportData}
              className="px-3 py-1 text-sm rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center space-x-1 disabled:bg-gray-300 disabled:cursor-not-allowed"
              title="Download report as CSV file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Report</span>
            </button>
            <button
              onClick={fetchReportData}
              className="px-3 py-1 text-sm rounded bg-gray-800 text-white hover:bg-gray-900 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {reportData && (
        <div className="mt-8 space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
            <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                      <dd className="text-lg font-semibold text-gray-900">{formatCurrency(reportData.totalRevenue)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                      <dd className="text-lg font-semibold text-gray-900">{reportData.totalBookings}</dd>
                    </dl>
            </div>
          </div>
        </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Active Bookings</dt>
                      <dd className="text-lg font-semibold text-gray-900">{reportData.activeBookings}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Vehicle Utilization</dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {Math.round((reportData.vehicleUtilization.rented / reportData.vehicleUtilization.total) * 100)}%
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
          </div>
      </div>

          {/* Vehicle Status */}
          <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Vehicle Status</h3>
              <div className="mt-5">
                <div className="relative pt-1">
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-green-600 bg-green-200">
                        Available
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-green-600">
                        {reportData.vehicleUtilization.available}
                      </span>
          </div>
            </div>
                  <div className="flex mb-2 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-200">
                        Rented
                      </span>
            </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-blue-600">
                        {reportData.vehicleUtilization.rented}
                      </span>
        </div>
      </div>
                  <div className="flex mb-2 items-center justify-between">
              <div>
                      <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-orange-600 bg-orange-200">
                        Maintenance
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block text-orange-600">
                        {reportData.vehicleUtilization.maintenance}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue by Vehicle Type */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Revenue by Vehicle Type</h3>
              <div className="mt-5">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle Type
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(reportData.revenueByVehicleType).map(([type, revenue]) => (
                      <tr key={type}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                          {formatCurrency(revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Monthly Revenue</h3>
              <div className="mt-5">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Month
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.monthlyRevenue.map((month, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {new Date(month.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                          {formatCurrency(month.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 