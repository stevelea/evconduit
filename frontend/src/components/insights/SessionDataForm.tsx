'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import type { ChargingSession, UpdateSessionData } from "@/types/charging";
import { useCurrency } from "@/hooks/useCurrency";

interface SessionDataFormProps {
  session: ChargingSession;
  onSave: (data: UpdateSessionData) => Promise<boolean>;
}

const CURRENCIES = [
  { value: "AED", label: "AED (د.إ)" },
  { value: "AUD", label: "AUD ($)" },
  { value: "CAD", label: "CAD ($)" },
  { value: "CHF", label: "CHF" },
  { value: "CZK", label: "CZK (Kč)" },
  { value: "DKK", label: "DKK (kr)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "NOK", label: "NOK (kr)" },
  { value: "NZD", label: "NZD ($)" },
  { value: "PLN", label: "PLN (zł)" },
  { value: "SEK", label: "SEK (kr)" },
  { value: "USD", label: "USD ($)" },
];

export default function SessionDataForm({ session, onSave }: SessionDataFormProps) {
  const userCurrency = useCurrency();
  const [costPerKwh, setCostPerKwh] = useState<string>("");
  const [totalCost, setTotalCost] = useState<string>("");
  // Default to session currency, then location-based currency, then detected user currency
  const [currency, setCurrency] = useState<string>(
    session.currency || session.default_currency || userCurrency.code || "EUR"
  );
  const [odometer, setOdometer] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [costMode, setCostMode] = useState<"per_kwh" | "total">("per_kwh");

  // Initialize form values from session
  useEffect(() => {
    if (session.cost_per_kwh !== null) {
      setCostPerKwh(session.cost_per_kwh.toString());
      setCostMode("per_kwh");
    }
    if (session.total_cost !== null) {
      setTotalCost(session.total_cost.toString());
      if (session.cost_per_kwh === null) {
        setCostMode("total");
      }
    }
    // Use saved currency, then location-based currency, then detected user currency
    if (session.currency) {
      setCurrency(session.currency);
    } else if (session.default_currency) {
      setCurrency(session.default_currency);
    } else if (userCurrency.code && !userCurrency.isLoading) {
      setCurrency(userCurrency.code);
    }
    if (session.user_odometer_km !== null) {
      setOdometer(session.user_odometer_km.toString());
    }
  }, [session, userCurrency.code, userCurrency.isLoading]);

  // Auto-calculate the other cost field when one changes
  useEffect(() => {
    if (costMode === "per_kwh" && costPerKwh && session.energy_added_kwh) {
      const perKwh = parseFloat(costPerKwh);
      if (!isNaN(perKwh)) {
        const total = perKwh * session.energy_added_kwh;
        setTotalCost(total.toFixed(2));
      }
    } else if (costMode === "total" && totalCost && session.energy_added_kwh) {
      const total = parseFloat(totalCost);
      if (!isNaN(total) && session.energy_added_kwh > 0) {
        const perKwh = total / session.energy_added_kwh;
        setCostPerKwh(perKwh.toFixed(4));
      }
    }
  }, [costPerKwh, totalCost, costMode, session.energy_added_kwh]);

  const handleSave = async () => {
    setSaving(true);

    const data: UpdateSessionData = {
      currency,
    };

    if (costMode === "per_kwh" && costPerKwh) {
      data.cost_per_kwh = parseFloat(costPerKwh);
      data.total_cost = null; // Let backend calculate
    } else if (costMode === "total" && totalCost) {
      data.total_cost = parseFloat(totalCost);
      data.cost_per_kwh = null; // Let backend calculate
    }

    if (odometer) {
      data.user_odometer_km = parseFloat(odometer);
    }

    const success = await onSave(data);

    if (success) {
      toast.success("Session data saved");
    } else {
      toast.error("Failed to save session data");
    }

    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Session Data</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add cost and odometer information for this charging session
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost Entry Mode Selection */}
        <div className="space-y-2">
          <Label>Cost Entry Method</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={costMode === "per_kwh" ? "default" : "outline"}
              size="sm"
              onClick={() => setCostMode("per_kwh")}
            >
              Cost per kWh
            </Button>
            <Button
              type="button"
              variant={costMode === "total" ? "default" : "outline"}
              size="sm"
              onClick={() => setCostMode("total")}
            >
              Total Cost
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cost per kWh */}
          <div className="space-y-2">
            <Label htmlFor="costPerKwh">Cost per kWh</Label>
            <Input
              id="costPerKwh"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 2.50"
              value={costPerKwh}
              onChange={(e) => {
                setCostPerKwh(e.target.value);
                if (e.target.value) setCostMode("per_kwh");
              }}
              disabled={costMode === "total" && totalCost !== ""}
            />
          </div>

          {/* Total Cost */}
          <div className="space-y-2">
            <Label htmlFor="totalCost">Total Cost</Label>
            <Input
              id="totalCost"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 125.00"
              value={totalCost}
              onChange={(e) => {
                setTotalCost(e.target.value);
                if (e.target.value) setCostMode("total");
              }}
              disabled={costMode === "per_kwh" && costPerKwh !== ""}
            />
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.value} value={curr.value}>
                    {curr.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Odometer */}
          <div className="space-y-2">
            <Label htmlFor="odometer">Odometer (km)</Label>
            <Input
              id="odometer"
              type="number"
              step="1"
              min="0"
              placeholder="e.g., 45000"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
            />
          </div>
        </div>

        {/* Energy info helper text */}
        {session.energy_added_kwh && (
          <p className="text-sm text-muted-foreground">
            Energy added: {session.energy_added_kwh.toFixed(2)} kWh
            {costPerKwh && totalCost && (
              <> | Calculated cost: {parseFloat(totalCost).toFixed(2)} {currency}</>
            )}
          </p>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
