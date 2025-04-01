'use client';

import { useState, useEffect } from 'react';

export default function TestTimePage() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentTimeIST, setCurrentTimeIST] = useState<string>('');

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      // Get current time in local timezone
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
      
      // Get current time in IST (UTC+5:30)
      const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      setCurrentTimeIST(now.toLocaleString('en-US', options));
    }, 1000);

    // Clean up interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Time Testing Page</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Time</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500 mb-1">Local Time:</p>
            <p className="text-2xl font-mono">{currentTime}</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-md">
            <p className="text-sm text-gray-500 mb-1">Indian Standard Time (IST):</p>
            <p className="text-2xl font-mono">{currentTimeIST}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Time Format Information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Local time is based on your browser's timezone</li>
          <li>IST is Indian Standard Time (UTC+5:30)</li>
          <li>Time format: HH:MM:SS AM/PM</li>
        </ul>
      </div>
    </div>
  );
} 