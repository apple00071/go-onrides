'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams, notFound } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { fetchReport } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ReportSummary {
  totalRevenue: number;
  totalBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  revenue: number;
  expenses: number;
  profit: number;
  profitMargin: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  bookings: number;
  expenses: number;
  profit: number;
}

interface TopPerformer {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  rentals: number;
}

interface SatisfactionRatings {
  [key: string]: number;
}

interface Satisfaction {
  average: number;
  ratings: SatisfactionRatings;
}

interface LoyaltyMetrics {
  repeatBookingRate: number;
  averageBookingsPerCustomer: number;
  topCustomers: Array<{
    id: string;
    name: string;
    rentals: number;
    revenue: number;
  }>;
}

interface ReportData {
  data: {
    summary: ReportSummary;
    monthlyData: MonthlyData[];
    topPerformers: TopPerformer[];
    satisfaction: Satisfaction;
    loyaltyMetrics: LoyaltyMetrics;
    totalRevenue: number;
    byVehicleType: { [key: string]: number };
    rentalDuration: { [key: string]: number };
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    customerSegments: { [key: string]: number };
  };
}

export default async function ReportViewPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id');
  
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        if (!reportId) {
          throw new Error('Report ID is required');
        }

        const data = await fetchReport(params.id);
        if (!data) {
          throw new Error('Failed to fetch report');
        }

        setReportData(data);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [reportId, params.id]);

  if (error || !reportData) {
    notFound();
  }

  const renderFinancialReport = () => {
    const { summary, monthlyData } = reportData.data;
    
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{formatCurrency(summary.revenue)}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Total Expenses</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{formatCurrency(summary.expenses)}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Net Profit</dt>
              <dd className="mt-1 text-3xl font-semibold text-green-600">{formatCurrency(summary.profit)}</dd>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Profit Margin</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{summary.profitMargin}%</dd>
            </div>
          </div>
        </div>

        {/* Monthly Financial Data */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Monthly Financial Overview</h3>
            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyData.map((month, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{month.month}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(month.revenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(month.expenses)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-right">{formatCurrency(month.profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRevenueReport = () => {
    const { summary, topPerformers } = reportData.data;
    
    return (
      <div className="space-y-8">
        {/* Top Performers Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Top Performing Vehicles</h3>
            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rentals</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {topPerformers.map((vehicle, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{vehicle.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vehicle.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(vehicle.revenue)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{vehicle.rentals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCustomerReport = () => {
    const { satisfaction, loyaltyMetrics } = reportData.data;
    
    return (
      <div className="space-y-8">
        {/* Customer Satisfaction */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Customer Satisfaction</h3>
            <div className="mt-4">
              <div className="text-3xl font-bold text-gray-900">{satisfaction.average.toFixed(1)}/5.0</div>
              <div className="mt-4 space-y-2">
                {Object.entries(satisfaction.ratings).map(([category, rating], index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{category}</span>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`h-5 w-5 ${
                            star <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"
                          }`}
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-sm text-gray-500">{rating.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Top Customers</h3>
            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rentals</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loyaltyMetrics.topCustomers.map((customer, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{customer.rentals}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(customer.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReportContent = () => {
    const reportType = reportId?.split('-')[0];
    
    switch (reportType) {
      case 'fin':
        return renderFinancialReport();
      case 'rev':
        return renderRevenueReport();
      case 'cus':
        return renderCustomerReport();
      default:
        return (
          <div className="bg-white shadow rounded-lg p-6">
            <p className="text-lg text-gray-700">Generic report content for ID: {reportId}</p>
            <pre className="mt-4 bg-gray-50 p-4 rounded-md overflow-x-auto">
              {JSON.stringify(reportData.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Report Details</h1>
        <Button>Download Report</Button>
      </div>

      <div className="grid gap-8">
        {/* Booking Statistics */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Booking Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-semibold">{reportData.data.summary.totalBookings}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Bookings</p>
              <p className="text-2xl font-semibold">{reportData.data.summary.activeBookings}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed Bookings</p>
              <p className="text-2xl font-semibold">{reportData.data.summary.completedBookings}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cancelled Bookings</p>
              <p className="text-2xl font-semibold">{reportData.data.summary.cancelledBookings}</p>
            </div>
          </div>
        </Card>

        {/* Revenue Statistics */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Revenue Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold">{formatCurrency(reportData.data.summary.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Booking Value</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(reportData.data.summary.totalRevenue / reportData.data.summary.totalBookings)}
              </p>
            </div>
          </div>
        </Card>

        {/* Monthly Performance */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Performance</h2>
          <div className="space-y-4">
            {reportData.data.monthlyData.map((month, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">{month.month}</span>
                <div className="space-x-4">
                  <span>Revenue: {formatCurrency(month.revenue)}</span>
                  <span>Bookings: {month.bookings}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Performers */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performers</h2>
          <div className="space-y-4">
            {reportData.data.topPerformers.map((performer, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="font-medium">{performer.name}</span>
                <div className="space-x-4">
                  <span>Revenue: {formatCurrency(performer.revenue)}</span>
                  <span>Bookings: {performer.bookings}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Customer Satisfaction */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Customer Satisfaction</h2>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <span className="font-medium">Average Rating</span>
              <span className="text-2xl font-semibold text-green-600">
                {reportData.data.satisfaction.average.toFixed(1)} / 5.0
              </span>
            </div>
            <Separator className="my-4" />
            <div className="space-y-4">
              {Object.entries(reportData.data.satisfaction.ratings).map(([category, rating], index) => (
                <div key={index} className="flex justify-between items-center">
                  <span>{category}</span>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`h-5 w-5 ${
                          star <= Math.round(rating) ? "text-yellow-400" : "text-gray-300"
                        }`}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <span className="ml-2">{rating.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Loyalty Metrics */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Loyalty Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500">Repeat Booking Rate</h4>
              <p className="mt-1 text-2xl font-semibold text-indigo-600">
                {reportData.data.loyaltyMetrics.repeatBookingRate}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-500">Avg. Rentals Per Customer</h4>
              <p className="mt-1 text-2xl font-semibold text-indigo-600">
                {reportData.data.loyaltyMetrics.averageBookingsPerCustomer}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {renderReportContent()}
    </div>
  );
} 