'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ReportTestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<any | null>(null);

  // Function to test database connection
  const testDatabaseConnection = async () => {
    setLoading(true);
    setError(null);
    setConnectionStatus(null);
    
    try {
      const response = await fetch('/api/test/db-connection', {
        credentials: 'include'
      });
      
      const result = await response.json();
      console.log('DB connection test result:', result);
      setConnectionStatus(result);
    } catch (err) {
      console.error('Error testing DB connection:', err);
      setError(err instanceof Error ? err.message : 'Failed to test database connection');
      setConnectionStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch report data directly
  const fetchReportData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      // Get date range (last 30 days by default)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await fetch(`/api/reports?start_date=${startDate}&end_date=${endDate}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Report API result:', result);
      setData(result);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch simplified mock report data
  const fetchSimpleReportData = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    
    try {
      const response = await fetch('/api/reports/simple', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Simple Report API result:', result);
      setData(result);
    } catch (err) {
      console.error('Error fetching simple report data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch simple report data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Report API Test</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Database Connection</h2>
        <Button 
          onClick={testDatabaseConnection}
          disabled={loading}
        >
          Test Database Connection
        </Button>
        
        {connectionStatus && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-medium">Connection Info:</h3>
            <pre className="mt-2 p-2 bg-white rounded text-sm overflow-auto">
              {JSON.stringify(connectionStatus, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Fetch Report Data</h2>
        <div className="flex space-x-4">
          <Button 
            onClick={fetchReportData}
            disabled={loading}
          >
            Fetch Full Report Data
          </Button>
          
          <Button 
            onClick={fetchSimpleReportData}
            variant="outline"
            disabled={loading}
          >
            Fetch Simple Mock Report
          </Button>
        </div>
        
        {data && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-medium">Report Data:</h3>
            <pre className="mt-2 p-2 bg-white rounded text-sm overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
      
      {loading && (
        <div className="flex justify-center my-8">
          <LoadingSpinner />
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded my-4">
          <h3 className="font-medium">Error:</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
} 