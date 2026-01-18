'use client';

import React from 'react';
import { Radio } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserContext } from '@/contexts/UserContext';

type Status = 'green' | 'yellow' | 'red' | 'grey';

const colorMap: Record<Status, string> = {
  green: 'text-green-500',
  yellow: 'text-yellow-400',
  red: 'text-red-500',
  grey: 'text-gray-400',
};

const labelMap: Record<Status, string> = {
  green: 'All vehicles online',
  yellow: 'Some vehicles offline',
  red: 'All vehicles offline',
  grey: 'No vehicles connected',
};

// Memoized to prevent unnecessary re-renders
export const OnlineStatusIcon = React.memo(function OnlineStatusIcon() {
  // Use centralized UserContext - no duplicate API calls or realtime listeners
  const { onlineStatus } = useUserContext();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Radio className={`w-4 h-4 transition-colors duration-300 ${colorMap[onlineStatus]}`} />
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span>{labelMap[onlineStatus]}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});
