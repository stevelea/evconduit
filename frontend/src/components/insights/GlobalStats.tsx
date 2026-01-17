"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Car, BatteryCharging, Zap } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { supabase } from "@/lib/supabaseClient";
import { useTranslation } from "react-i18next";

type GlobalStats = {
  unique_users: number | null;
  unique_vehicles: number | null;
  total_sessions: number | null;
  total_kwh_charged: number | null;
  total_minutes_charged: number | null;
  average_charge_rate_kwh_per_hour: number | null;
  highest_max_charge_rate_kw: number | null;
  highest_average_charge_rate_kw: number | null;
  min_start_time: string | null;
  max_end_time: string | null;
};

export default function GlobalStats() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const { i18n } = useTranslation();

    useEffect(() => {
        const fetchStats = async () => {
            const {
            data: { session },
            } = await supabase.auth.getSession();

            if (!session?.access_token) {
            console.error("No access token found");
            return;
            }

            const res = await authFetch("/api/stats/global", {
            method: "GET",
            accessToken: session.access_token,
            });

            if (res.data) setStats(res.data);
            else console.error(res.error);
        };

        fetchStats();
    }, []);

  if (!stats) return null;

  const formatMinutesToDuration = (totalMinutes: number): string => {
    const minutesInHour = 60;
    const minutesInDay = 24 * minutesInHour;
    const minutesInMonth = 30 * minutesInDay; // Approximate

    if (totalMinutes >= minutesInMonth) {
      const months = Math.floor(totalMinutes / minutesInMonth);
      const remainingMinutes = totalMinutes % minutesInMonth;
      const days = Math.floor(remainingMinutes / minutesInDay);
      return `${months} months ${days} days`;
    } else if (totalMinutes >= minutesInDay) {
      const days = Math.floor(totalMinutes / minutesInDay);
      const remainingMinutes = totalMinutes % minutesInDay;
      const hours = Math.floor(remainingMinutes / minutesInHour);
      const minutes = remainingMinutes % minutesInHour;
      return `${days} days ${hours} hours ${minutes} minutes`;
    } else if (totalMinutes >= minutesInHour) {
      const hours = Math.floor(totalMinutes / minutesInHour);
      const minutes = totalMinutes % minutesInHour;
      return `${hours} hours ${minutes} minutes`;
    } else {
      return `${totalMinutes} minutes`;
    }
  };

  const formatKwhToLargerUnits = (kwh: number | null): string => {
    if (kwh == null) return 'N/A';
    if (kwh >= 1_000_000) {
      return `${(kwh / 1_000_000).toFixed(3)} TWh`;
    } else if (kwh >= 1_000) {
      return `${(kwh / 1_000).toFixed(2)} MWh`;
    } else {
      return `${kwh.toFixed(2)} kWh`;
    }
  };

  const formatNumber = (value: number | null, suffix: string): string => {
    if (value == null) return 'N/A';
    return `${value.toFixed(2)} ${suffix}`;
  };

  const statItems = [
    { icon: Users, label: "Users", value: stats.unique_users ?? 0 },
    { icon: Car, label: "Vehicles", value: stats.unique_vehicles ?? 0 },
    { icon: BatteryCharging, label: "Charging Sessions", value: stats.total_sessions ?? 0 },
    { icon: Zap, label: "Total kWh Charged", value: formatKwhToLargerUnits(stats.total_kwh_charged) },
    { icon: BatteryCharging, label: "Total Minutes Charged", value: stats.total_minutes_charged != null ? formatMinutesToDuration(stats.total_minutes_charged) : 'N/A' },
    { icon: Zap, label: "Average Charge Rate", value: formatNumber(stats.average_charge_rate_kwh_per_hour, 'kWh/h') },
    { icon: Zap, label: "Highest Max Charge Rate", value: formatNumber(stats.highest_max_charge_rate_kw, 'kW') },
    { icon: Zap, label: "Highest Average Charge Rate", value: formatNumber(stats.highest_average_charge_rate_kw, 'kW') },
  ];

  const startDate = stats.min_start_time ? new Date(stats.min_start_time) : null;
  const endDate = stats.max_end_time ? new Date(stats.max_end_time) : null;

  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card className="p-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Charging Insights</CardTitle>
        <p className="text-sm text-muted-foreground">
          Statistics based on charging sessions. Users and vehicles count reflect those with recorded charging sessions.
        </p>
        {startDate && endDate && (
          <div className="text-sm text-muted-foreground">
            Data collected between {dateFormatter.format(startDate)} and {dateFormatter.format(endDate)}.
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statItems.map(({ icon: Icon, label, value }) => (
            <Card key={label} className="flex items-center p-4 gap-4">
              <Icon className="w-6 h-6 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-lg font-bold text-center">{value}</div>
              </div>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
