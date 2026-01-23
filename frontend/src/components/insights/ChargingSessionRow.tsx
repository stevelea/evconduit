'use client';

import Link from "next/link";
import { Battery, Clock, Zap, ChevronRight } from "lucide-react";
import type { ChargingSession } from "@/types/charging";

interface ChargingSessionRowProps {
  session: ChargingSession;
}

export default function ChargingSessionRow({ session }: ChargingSessionRowProps) {
  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);

  // Format date/time
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Format duration
  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Vehicle display name
  const vehicleName =
    session.brand && session.model
      ? `${session.brand} ${session.model}${session.year ? ` (${session.year})` : ""}`
      : "Unknown Vehicle";

  return (
    <Link
      href={`/insights/sessions/${session.session_id}`}
      className="block hover:bg-muted/50 transition-colors rounded-lg"
    >
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="flex-1 min-w-0">
          {/* Date and Vehicle */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium">{dateFormatter.format(startDate)}</span>
            <span className="text-muted-foreground text-sm">|</span>
            <span className="text-sm text-muted-foreground truncate">{vehicleName}</span>
          </div>

          {/* Time range */}
          <div className="text-sm text-muted-foreground mb-2">
            {timeFormatter.format(startDate)} - {timeFormatter.format(endDate)}
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {/* Battery change */}
            <div className="flex items-center gap-1">
              <Battery className="h-4 w-4 text-green-500" />
              <span>
                {session.start_battery_level ?? "-"}% → {session.end_battery_level ?? "-"}%
              </span>
            </div>

            {/* Energy added */}
            {session.energy_added_kwh !== null && (
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>{session.energy_added_kwh.toFixed(1)} kWh</span>
              </div>
            )}

            {/* Duration */}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>{formatDuration(session.duration_minutes)}</span>
            </div>

            {/* Cost (if entered) */}
            {session.total_cost !== null && session.currency && (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                <span>
                  {session.total_cost.toFixed(2)} {session.currency}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-4" />
      </div>
    </Link>
  );
}
