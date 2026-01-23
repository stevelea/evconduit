'use client';

import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with webpack/next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

const tooltipStyles = `
  .marker-number-tooltip {
    background: #3b82f6 !important;
    border: none !important;
    border-radius: 50% !important;
    color: white !important;
    font-weight: bold !important;
    font-size: 12px !important;
    padding: 2px 6px !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  }
  .marker-number-tooltip::before {
    display: none !important;
  }
`;

const TOMTOM_API_KEY = 'zJAY68Vhz7j5a0t0oQeyLgiWaNtd7mmW';

type Marker = {
  lat: number;
  lng: number;
  name: string;
};

type TomTomMapProps = {
  onLocationClick: (lat: number, lng: number) => void;
  markers: Marker[];
};

export default function TomTomMap({ onLocationClick, markers }: TomTomMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map centered on NSW, Australia
    const map = L.map(mapContainerRef.current).setView([-32.0, 151.5], 8);

    // Add TomTom map tiles
    L.tileLayer(`https://api.tomtom.com/map/1/tile/basic/main/{z}/{x}/{y}.png?key=${TOMTOM_API_KEY}`, {
      attribution: '&copy; <a href="https://www.tomtom.com">TomTom</a>',
      maxZoom: 22,
    }).addTo(map);

    // Create markers layer
    markersLayerRef.current = L.layerGroup().addTo(map);

    // Handle click events
    map.on('click', (e: L.LeafletMouseEvent) => {
      onLocationClick(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onLocationClick]);

  // Update markers when they change
  useEffect(() => {
    if (!markersLayerRef.current) return;

    // Clear existing markers
    markersLayerRef.current.clearLayers();

    // Add new markers
    markers.forEach((marker, index) => {
      const leafletMarker = L.marker([marker.lat, marker.lng])
        .bindPopup(marker.name || `Point ${index + 1}`)
        .bindTooltip(`${index + 1}`, {
          permanent: true,
          direction: 'center',
          className: 'marker-number-tooltip',
        });
      markersLayerRef.current?.addLayer(leafletMarker);
    });

    // Fit bounds if there are markers
    if (markers.length > 0 && mapRef.current) {
      const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [markers]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: tooltipStyles }} />
      <div
        ref={mapContainerRef}
        className="h-[500px] rounded-lg border"
        style={{ zIndex: 0 }}
      />
      <p className="mt-2 text-sm text-muted-foreground text-center">
        Click anywhere on the map to query road classification at that location
      </p>
    </>
  );
}
