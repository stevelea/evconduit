'use client';

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Battery, Clock, Zap, Car, Calendar, Gauge, MapPin, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useChargingSessionDetail } from "@/hooks/useChargingSessions";
import ChargeCurveChart from "@/components/insights/ChargeCurveChart";
import PowerDeliveryChart from "@/components/insights/PowerDeliveryChart";
import SessionDataForm from "@/components/insights/SessionDataForm";
import { Loader2 } from "lucide-react";

interface SessionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SessionDetailPage({ params }: SessionDetailPageProps) {
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;
  const { session, samples, loading, error, updateSession } = useChargingSessionDetail(sessionId);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/insights">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Insights
            </Link>
          </Button>
        </div>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading session details...</span>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/insights">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Insights
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-destructive">
              {error || "Session not found"}
            </p>
            <Button className="mt-4" asChild>
              <Link href="/insights">Return to Insights</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const startDate = new Date(session.start_time);
  const endDate = new Date(session.end_time);

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const formatDuration = (minutes: number | null): string => {
    if (minutes === null) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const vehicleName =
    session.brand && session.model
      ? `${session.brand} ${session.model}${session.year ? ` (${session.year})` : ""}`
      : "Unknown Vehicle";

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/insights">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Insights
          </Link>
        </Button>
      </div>

      {/* Session Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Charging Session Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{dateFormatter.format(startDate)}</p>
                <p className="text-sm text-muted-foreground">
                  {timeFormatter.format(startDate)} - {timeFormatter.format(endDate)}
                </p>
              </div>
            </div>

            {/* Vehicle */}
            <div className="flex items-start gap-3">
              <Car className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{vehicleName}</p>
                <p className="text-sm text-muted-foreground">Vehicle</p>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{formatDuration(session.duration_minutes)}</p>
                <p className="text-sm text-muted-foreground">Duration</p>
              </div>
            </div>

            {/* Battery Change */}
            <div className="flex items-start gap-3">
              <Battery className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">
                  {session.start_battery_level ?? "-"}% → {session.end_battery_level ?? "-"}%
                </p>
                <p className="text-sm text-muted-foreground">Battery Level</p>
              </div>
            </div>

            {/* Energy Added */}
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">
                  {session.energy_added_kwh?.toFixed(2) ?? "-"} kWh
                </p>
                <p className="text-sm text-muted-foreground">Energy Added</p>
              </div>
            </div>

            {/* Charge Rate */}
            <div className="flex items-start gap-3">
              <Gauge className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">
                  {session.average_charge_rate_kw?.toFixed(1) ?? "-"} kW avg
                  {session.max_charge_rate_kw && (
                    <span className="text-sm text-muted-foreground">
                      {" "}/ {session.max_charge_rate_kw.toFixed(1)} kW max
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Charge Rate</p>
              </div>
            </div>

            {/* Charging Location */}
            {session.charging_location && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {session.charging_location.name || "Charging Station"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {session.charging_location.operator && (
                      <span>{session.charging_location.operator}</span>
                    )}
                    {session.charging_location.address && (
                      <span className="block">{session.charging_location.address}</span>
                    )}
                    {session.charging_location.distance_meters !== null && (
                      <span className="block">
                        ~{Math.round(session.charging_location.distance_meters)}m away
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Show coordinates if no charging location found but we have coords */}
            {!session.charging_location && session.latitude && session.longitude && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {session.latitude.toFixed(4)}, {session.longitude.toFixed(4)}
                  </p>
                </div>
              </div>
            )}

            {/* Consumption (if calculated from odometer readings) */}
            {session.consumption_kwh_per_100km && (
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {session.consumption_kwh_per_100km} kWh/100km
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Consumption
                    {session.distance_since_last_session_km && (
                      <span> ({session.distance_since_last_session_km} km driven)</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChargeCurveChart
          samples={samples}
          startBattery={session.start_battery_level}
          endBattery={session.end_battery_level}
        />
        <PowerDeliveryChart
          samples={samples}
          maxChargeRate={session.max_charge_rate_kw}
          avgChargeRate={session.average_charge_rate_kw}
        />
      </div>

      {/* User Data Form */}
      <SessionDataForm session={session} onSave={updateSession} />
    </div>
  );
}
