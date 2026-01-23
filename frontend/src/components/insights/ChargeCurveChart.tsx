'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChargingSample } from "@/types/charging";

interface ChargeCurveChartProps {
  samples: ChargingSample[];
  startBattery?: number | null;
  endBattery?: number | null;
}

// Use a fixed green color for the battery chart line
const CHART_COLOR = "#22c55e";

export default function ChargeCurveChart({
  samples,
  startBattery,
  endBattery,
}: ChargeCurveChartProps) {

  if (!samples || samples.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Battery Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No sample data available for this session
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart - filter out null values
  const chartData = samples
    .filter((sample) => sample.battery_level !== null)
    .map((sample) => {
      const time = new Date(sample.sample_time);
      return {
        time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        batteryLevel: sample.battery_level,
      };
    });

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Battery Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No valid battery data in samples
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate Y-axis domain based on actual data
  const batteryLevels = chartData.map((d) => d.batteryLevel as number);
  const dataMin = Math.min(...batteryLevels);
  const dataMax = Math.max(...batteryLevels);
  const minBattery = Math.max(0, Math.floor(dataMin / 10) * 10 - 10);
  const maxBattery = Math.min(100, Math.ceil(dataMax / 10) * 10 + 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Battery Level</CardTitle>
        {startBattery !== null && endBattery !== null && (
          <p className="text-sm text-muted-foreground">
            {startBattery}% → {endBattery}%
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[minBattery, maxBattery]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
                formatter={(value) => [`${value}%`, "Battery"]}
              />
              <Line
                type="monotone"
                dataKey="batteryLevel"
                stroke={CHART_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLOR }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
