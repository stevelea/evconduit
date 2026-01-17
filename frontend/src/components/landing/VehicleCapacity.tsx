// src/components/landing/VehicleCapacity.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface CapacityData {
  current: number;
  max: number;
  percentage: number;
}

export default function VehicleCapacity() {
  const [capacity, setCapacity] = useState<CapacityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCapacity = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const response = await fetch(`${apiUrl}/public/vehicle-capacity`);
        if (response.ok) {
          const data = await response.json();
          setCapacity(data);
        }
      } catch (error) {
        console.error('Failed to fetch vehicle capacity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCapacity();
  }, []);

  if (loading || !capacity) {
    return null;
  }

  // Determine color based on percentage
  const progressColor = capacity.percentage >= 90
    ? 'bg-red-500'
    : capacity.percentage >= 70
      ? 'bg-yellow-500'
      : 'bg-green-500';

  return (
    <Card className="bg-indigo-900/50 border-indigo-700 shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚗</span>
              <h3 className="font-semibold text-white">Vehicle Capacity</h3>
            </div>
            <span className="text-white font-bold">{capacity.percentage}%</span>
          </div>
          {/* Custom progress bar with dynamic color */}
          <div className="h-3 bg-indigo-950 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} transition-all duration-300`}
              style={{ width: `${capacity.percentage}%` }}
            />
          </div>
          <p className="text-indigo-200 text-sm text-center">
            {capacity.current} of {capacity.max} vehicles registered
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
