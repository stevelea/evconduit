'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileDown, Trash2, MapPin, Check, X, ExternalLink } from 'lucide-react';
import jsPDF from 'jspdf';

// Dynamically import map component to avoid SSR issues with Leaflet
const TomTomMap = dynamic(() => import('@/components/tomtom/TomTomMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] bg-muted flex items-center justify-center rounded-lg">
      Loading map...
    </div>
  ),
});

const TOMTOM_API_KEY = 'zJAY68Vhz7j5a0t0oQeyLgiWaNtd7mmW';

export type RoadClassificationResult = {
  id: string;
  locationName: string;
  lat: number;
  lng: number;
  route: string;
  speedLimit: number | null;
  roadUse: string[];
  hasLimitedAccess: boolean;
  rawResponse: Record<string, unknown>;
};

export default function TomTomPage() {
  const [results, setResults] = useState<RoadClassificationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoadClassification = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);

    try {
      const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?key=${TOMTOM_API_KEY}&returnSpeedLimit=true&returnRoadUse=true`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`TomTom API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.addresses || data.addresses.length === 0) {
        throw new Error('No address data returned for this location');
      }

      const address = data.addresses[0];
      const roadUse = address.roadUse || [];
      const speedLimit = address.address?.speedLimit || null;
      const route = address.address?.streetName || address.address?.street || 'Unknown';

      // Build a location name from address components
      const addr = address.address || {};
      const locationName = addr.municipalitySubdivision
        || addr.localName
        || addr.municipality
        || addr.countrySecondarySubdivision
        || '';

      const result: RoadClassificationResult = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        locationName,
        lat,
        lng,
        route,
        speedLimit,
        roadUse,
        hasLimitedAccess: roadUse.includes('LimitedAccess'),
        rawResponse: data,
      };

      setResults((prev) => [...prev, result]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch road classification');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateLocationName = (id: string, name: string) => {
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, locationName: name } : r))
    );
  };

  const removeResult = (id: string) => {
    setResults((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAllResults = () => {
    setResults([]);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TomTom Road Classification Issue Report', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Subtitle
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bolditalic');
    doc.text('Impact on XPeng G6 Adaptive Lane Centering (ALC)', margin, y);
    y += 8;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const today = new Date().toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    doc.text(`Date: ${today}`, margin, y);
    y += 15;

    // Executive Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryText = `This report documents road classification data from TomTom's mapping database. These classifications can impact the availability of Advanced Driver Assistance System (ADAS) features, specifically Adaptive Lane Centering (ALC), in vehicles using TomTom's map engine, including the XPeng G6.`;
    const summaryLines = doc.splitTextToSize(summaryText, pageWidth - margin * 2);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 5 + 10;

    // Road Classification Analysis
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Road Classification Analysis', margin, y);
    y += 10;

    // Table headers
    const colWidths = [35, 45, 20, 25, 40, 15];
    const headers = ['Location', 'Coordinates', 'Route', 'Speed', 'TomTom roadUse', 'ALC'];

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    let x = margin;
    headers.forEach((header, i) => {
      doc.text(header, x + 2, y);
      x += colWidths[i];
    });
    y += 8;

    // Table rows
    doc.setFont('helvetica', 'normal');
    results.forEach((result, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, y - 5, pageWidth - margin * 2, 8, 'F');
      }

      x = margin;
      const rowData = [
        result.locationName || `Point ${index + 1}`,
        `${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`,
        result.route,
        result.speedLimit ? `${result.speedLimit} km/h` : 'N/A',
        result.roadUse.join(' + ') || 'N/A',
        result.hasLimitedAccess ? 'Yes' : 'No',
      ];

      doc.setFontSize(8);
      rowData.forEach((data, i) => {
        const truncated = data.length > 20 ? data.substring(0, 17) + '...' : data;
        doc.text(truncated, x + 2, y);
        x += colWidths[i];
      });

      // ALC indicator color
      if (result.hasLimitedAccess) {
        doc.setTextColor(0, 128, 0);
        doc.text('Yes', margin + colWidths.slice(0, 5).reduce((a, b) => a + b, 0) + 2, y);
      } else {
        doc.setTextColor(200, 0, 0);
        doc.text('No', margin + colWidths.slice(0, 5).reduce((a, b) => a + b, 0) + 2, y);
      }
      doc.setTextColor(0, 0, 0);

      y += 8;
    });

    y += 10;

    // Key Findings
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Findings', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const alcCount = results.filter((r) => r.hasLimitedAccess).length;
    const findingsText = `Analysis of TomTom's Reverse Geocoding API reveals that ${alcCount} out of ${results.length} locations have the 'LimitedAccess' classification required for Adaptive Lane Centering. The XPeng G6's ADAS system requires the 'LimitedAccess' classification to enable ALC. Roads classified only as 'Arterial' do not permit ALC activation.`;
    const findingsLines = doc.splitTextToSize(findingsText, pageWidth - margin * 2);
    doc.text(findingsLines, margin, y);
    y += findingsLines.length * 5 + 10;

    // Technical Reference
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Technical Reference', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const techText = `Data was obtained via TomTom Reverse Geocoding API v2 with returnRoadUse=true parameter. The 'roadUse' field returns classifications including 'LimitedAccess' for controlled-access highways and 'Arterial' for major roads.`;
    const techLines = doc.splitTextToSize(techText, pageWidth - margin * 2);
    doc.text(techLines, margin, y);

    doc.save('TomTom_Road_Classification_Report.pdf');
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">TomTom Road Classification Tool</h1>
          <p className="text-muted-foreground">
            Click on the map to query road classification data from TomTom&apos;s API
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Interactive Map
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TomTomMap
              onLocationClick={fetchRoadClassification}
              markers={results.map((r) => ({ lat: r.lat, lng: r.lng, name: r.locationName }))}
            />
            {loading && (
              <div className="mt-4 text-center text-muted-foreground">
                Fetching road classification...
              </div>
            )}
            {error && (
              <div className="mt-4 text-center text-red-500">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Road Classification Results</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearAllResults}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                  <Button size="sm" onClick={generatePDF}>
                    <FileDown className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Location</th>
                      <th className="text-left p-3 font-medium">Coordinates</th>
                      <th className="text-left p-3 font-medium">Route</th>
                      <th className="text-left p-3 font-medium">Speed</th>
                      <th className="text-left p-3 font-medium">TomTom roadUse</th>
                      <th className="text-center p-3 font-medium">ALC</th>
                      <th className="text-center p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={result.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <Input
                            placeholder={`Point ${index + 1}`}
                            value={result.locationName}
                            onChange={(e) => updateLocationName(result.id, e.target.value)}
                            className="h-8 w-32"
                          />
                        </td>
                        <td className="p-3 font-mono text-xs">
                          {result.lat.toFixed(6)}, {result.lng.toFixed(6)}
                        </td>
                        <td className="p-3">{result.route}</td>
                        <td className="p-3">
                          {result.speedLimit ? `${result.speedLimit} km/h` : 'N/A'}
                        </td>
                        <td className="p-3">
                          {result.roadUse.length > 0 ? result.roadUse.join(' + ') : 'N/A'}
                        </td>
                        <td className="p-3 text-center">
                          {result.hasLimitedAccess ? (
                            <Check className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="h-5 w-5 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeResult(result.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <p>Found incorrect road classifications?</p>
                <p>Report them to TomTom via MapShare to help improve map data.</p>
              </div>
              <Button variant="outline" asChild>
                <a
                  href="https://www.tomtom.com/mapshare/tools/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Report on MapShare
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <p>
            This tool uses TomTom&apos;s Reverse Geocoding API to retrieve road classification data.
          </p>
          <p>
            ALC (Adaptive Lane Centering) requires &apos;LimitedAccess&apos; classification for XPeng G6.
          </p>
        </div>
      </div>
    </div>
  );
}
