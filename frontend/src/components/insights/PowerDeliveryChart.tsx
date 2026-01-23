'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChargingSample } from "@/types/charging";

interface PowerDeliveryChartProps {
  samples: ChargingSample[];
  maxChargeRate?: number | null;
  avgChargeRate?: number | null;
}

// Use a fixed blue color for the charge rate chart
const CHART_COLOR = "#3b82f6";

export default function PowerDeliveryChart({
  samples,
  maxChargeRate,
  avgChargeRate,
}: PowerDeliveryChartProps) {

  if (!samples || samples.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Charge Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No sample data available for this session
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format data for chart
  const chartData = samples.map((sample) => {
    const time = new Date(sample.sample_time);
    return {
      time: time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      chargeRate: sample.charge_rate_kw ?? 0,
    };
  });

  // Calculate Y-axis domain
  const chargeRates = samples
    .map((s) => s.charge_rate_kw)
    .filter((v): v is number => v !== null && v > 0);

  const maxRate = chargeRates.length > 0 ? Math.max(...chargeRates) : (maxChargeRate ?? 10);
  const yMax = Math.ceil(maxRate / 10) * 10 + 5;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Charge Rate</CardTitle>
        {(maxChargeRate || avgChargeRate) && (
          <p className="text-sm text-muted-foreground">
            {maxChargeRate && `Max: ${maxChargeRate.toFixed(1)} kW`}
            {maxChargeRate && avgChargeRate && " | "}
            {avgChargeRate && `Avg: ${avgChargeRate.toFixed(1)} kW`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, yMax]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
                label={{
                  value: "kW",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 10, fill: "#6b7280" },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
                formatter={(value) => [`${Number(value).toFixed(1)} kW`, "Charge Rate"]}
              />
              <defs>
                <linearGradient id="chargeRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="chargeRate"
                stroke={CHART_COLOR}
                strokeWidth={2}
                fill="url(#chargeRateGradient)"
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLOR }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
