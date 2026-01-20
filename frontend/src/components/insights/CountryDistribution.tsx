"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe } from "lucide-react";
import { authFetch } from "@/lib/authFetch";
import { supabase } from "@/lib/supabaseClient";

type CountryData = {
  country_code: string;
  country: string;
  count: number;
};

// Convert country code to flag emoji
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '';
  // Use globe emoji for unknown location
  if (code === 'XX') return '🌍';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default function CountryDistribution() {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const res = await authFetch("/api/stats/vehicles-by-country", {
        method: "GET",
        accessToken: session.access_token,
      });

      if (res.data?.vehicles_by_country) {
        setCountries(res.data.vehicles_by_country);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card className="p-4">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Vehicles by Country
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-gray-200 rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!countries.length) {
    return null;
  }

  const total = countries.reduce((sum, c) => sum + c.count, 0);

  // Colors for the bars
  const colors = [
    "bg-indigo-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-cyan-500",
  ];

  return (
    <Card className="p-4">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          Vehicles by Country
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of {total} vehicles across {countries.length} countries
        </p>
      </CardHeader>
      <CardContent className="p-0 space-y-3">
        {countries.map((country, index) => {
          const percentage = ((country.count / total) * 100).toFixed(1);
          const barColor = colors[index % colors.length];

          return (
            <div key={country.country_code} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-lg">{countryCodeToFlag(country.country_code)}</span>
                  <span className="font-medium">{country.country}</span>
                </span>
                <span className="text-muted-foreground">
                  {country.count} ({percentage}%)
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
