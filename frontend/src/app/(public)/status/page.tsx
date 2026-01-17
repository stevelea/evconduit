'use client';

import { useEffect, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

type ServiceStatus = {
  name: string;
  status: 'checking' | 'online' | 'offline';
  responseTime?: number;
  error?: string;
};

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Frontend', status: 'checking' },
    { name: 'Backend API', status: 'checking' },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkServices = async () => {
    // Frontend is online if this page loads
    const frontendStatus: ServiceStatus = {
      name: 'Frontend',
      status: 'online',
      responseTime: 0,
    };

    // Check backend
    let backendStatus: ServiceStatus = {
      name: 'Backend API',
      status: 'checking',
    };

    try {
      const startTime = performance.now();
      const backendUrl = API_BASE_URL
        ? `${API_BASE_URL.replace(/\/$/, '')}/status`
        : '/api/status';

      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const endTime = performance.now();

      if (response.ok) {
        backendStatus = {
          name: 'Backend API',
          status: 'online',
          responseTime: Math.round(endTime - startTime),
        };
      } else {
        backendStatus = {
          name: 'Backend API',
          status: 'offline',
          error: `HTTP ${response.status}`,
        };
      }
    } catch (err) {
      backendStatus = {
        name: 'Backend API',
        status: 'offline',
        error: err instanceof Error ? err.message : 'Connection failed',
      };
    }

    setServices([frontendStatus, backendStatus]);
    setLastChecked(new Date());
  };

  useEffect(() => {
    checkServices();
    // Refresh every 30 seconds
    const interval = setInterval(checkServices, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-400 animate-pulse';
    }
  };

  const getStatusText = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'online':
        return 'Operational';
      case 'offline':
        return 'Offline';
      default:
        return 'Checking...';
    }
  };

  const allOperational = services.every((s) => s.status === 'online');
  const someOffline = services.some((s) => s.status === 'offline');

  return (
    <div className="min-h-[60vh] flex flex-col items-center p-8">
      <div className="w-full max-w-xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">System Status</h1>
        <p className="text-gray-600 mb-6">
          Current operational status of EVConduit services.
        </p>

        {/* Overall Status Banner */}
        <div
          className={`rounded-lg p-4 mb-6 ${
            allOperational
              ? 'bg-green-50 border border-green-200'
              : someOffline
              ? 'bg-red-50 border border-red-200'
              : 'bg-gray-50 border border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                allOperational
                  ? 'bg-green-500'
                  : someOffline
                  ? 'bg-red-500'
                  : 'bg-gray-400 animate-pulse'
              }`}
            />
            <span
              className={`font-medium ${
                allOperational
                  ? 'text-green-800'
                  : someOffline
                  ? 'text-red-800'
                  : 'text-gray-800'
              }`}
            >
              {allOperational
                ? 'All Systems Operational'
                : someOffline
                ? 'Some Systems Experiencing Issues'
                : 'Checking Systems...'}
            </span>
          </div>
        </div>

        {/* Service List */}
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${getStatusColor(
                    service.status
                  )}`}
                />
                <span className="font-medium text-gray-900">{service.name}</span>
              </div>
              <div className="flex items-center gap-4">
                {service.responseTime !== undefined && service.status === 'online' && (
                  <span className="text-sm text-gray-500">
                    {service.responseTime}ms
                  </span>
                )}
                {service.error && (
                  <span className="text-sm text-red-600">{service.error}</span>
                )}
                <span
                  className={`text-sm font-medium ${
                    service.status === 'online'
                      ? 'text-green-600'
                      : service.status === 'offline'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {getStatusText(service.status)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Last Checked */}
        <div className="mt-6 flex items-center justify-between text-sm text-gray-500">
          <span>
            {lastChecked
              ? `Last checked: ${lastChecked.toLocaleTimeString()}`
              : 'Checking...'}
          </span>
          <button
            onClick={checkServices}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
