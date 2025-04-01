'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/format';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ReportData {
  id: string;
  title: string;
  description: string;
  dateRange: {
    start: string;
    end: string;
  };
  totalRevenue: number;
  byVehicleType: {
    type: string;
    revenue: number;
    count: number;
  }[];
  bookingDuration: {
    duration: string;
    count: number;
  }[];
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerSegments: {
    segment: string;
    count: number;
  }[];
}

export default function ReportViewPage() {
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reportId = useSearchParams().get('id');

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) {
        setError('No report ID provided');
        setLoading(false);
        return;
      }

      try {
        // Get date range (last 30 days by default)
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        console.log('Fetching report with params:', { startDate, endDate });
        
        // Use the simplified mock API endpoint instead of the regular one
        const response = await fetch(`/api/reports/simple`, {
          credentials: 'include'
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Report API error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch report: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Report API response:', result);
        
        if (!result.data) {
          throw new Error('API response missing data property');
        }

        const { data } = result;

        // Transform API data to match the expected report structure
        const transformedData: ReportData = {
          id: reportId,
          title: 'Monthly Performance Report',
          description: 'Overview of bookings, revenue, and customer activity',
          dateRange: {
            start: startDate,
            end: endDate
          },
          totalRevenue: data.totalRevenue,
          byVehicleType: data.byVehicleType || [],
          bookingDuration: data.bookingDuration || [],
          totalCustomers: data.totalCustomers,
          newCustomers: data.newCustomers,
          returningCustomers: data.returningCustomers,
          customerSegments: data.customerSegments || []
        };

        setReport(transformedData);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500">Error: {error}</div>;
  if (!report) return <div>No report found</div>;

  const vehicleTypeData = {
    labels: report.byVehicleType.map(item => item.type),
    datasets: [
      {
        label: 'Revenue by Vehicle Type',
        data: report.byVehicleType.map(item => item.revenue),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const rentalDurationData = {
    labels: report.bookingDuration.map(item => item.duration),
    datasets: [
      {
        label: 'Booking Duration Distribution',
        data: report.bookingDuration.map(item => item.count),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const customerSegmentData = {
    labels: report.customerSegments.map(item => item.segment),
    datasets: [
      {
        data: report.customerSegments.map(item => item.count),
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };
    
    return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{report.title}</h1>
          <p className="text-gray-600">{report.description}</p>
          <p className="text-sm text-gray-500">
            {formatDate(report.dateRange.start)} - {formatDate(report.dateRange.end)}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/reports')}
        >
          Back to Reports
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
            <div>
                <dt className="text-sm font-medium text-gray-500">Total Revenue</dt>
                <dd className="text-3xl font-bold">{formatCurrency(report.totalRevenue)}</dd>
            </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
            <div>
                <dt className="text-sm font-medium text-gray-500">Total Customers</dt>
                <dd className="text-3xl font-bold">{report.totalCustomers}</dd>
            </div>
              <div className="grid grid-cols-2 gap-4">
            <div>
                  <dt className="text-sm font-medium text-gray-500">New Customers</dt>
                  <dd className="text-xl font-semibold">{report.newCustomers}</dd>
          </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Returning Customers</dt>
                  <dd className="text-xl font-semibold">{report.returningCustomers}</dd>
        </div>
              </div>
            </dl>
          </CardContent>
        </Card>
            </div>
            
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Vehicle Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={vehicleTypeData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Duration Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar data={rentalDurationData} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="w-96">
            <Pie data={customerSegmentData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 