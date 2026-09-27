import mapboxgl, { Map, LngLatLike, LngLatBounds, Marker, Popup } from 'mapbox-gl';
import { useEffect, useRef, useState } from 'react';

// Mapbox GL JS needs to access window, so we check for typeof window !== 'undefined'
if (typeof window !== 'undefined') {
  (mapboxgl as any).accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;
}

// Import Mapbox GL CSS
import "mapbox-gl/dist/mapbox-gl.css";

type Location = {
  latitude: number | null;
  longitude: number | null;
  label: string;
  color?: string;
};

type PickupMapProps = {
  volunteerLocation: Location;
  donorLocation: Location;
  ngoLocation: Location;
  className?: string;
};

export default function PickupMap({
  volunteerLocation,
  donorLocation,
  ngoLocation,
  className = '',
}: PickupMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markersRef = useRef<(Marker | null)[]>([null, null, null]); // [volunteer, donor, ngo]
  const [mapReady, setMapReady] = useState(false);

  // Initialize map - runs once after mount
  useEffect(() => {
    if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN || !mapRef.current) {
      return;
    }

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [0, 0], // Will be updated when we have locations
      zoom: 1,
    });

    mapInstanceRef.current = map;
    setMapReady(true);

    // Clean up on unmount
    return () => {
      // Remove all markers
      markersRef.current.forEach((marker) => {
        if (marker) {
          marker.remove();
        }
      });

      // Remove map
      if (map) {
        map.remove();
      }
    };
  }, []); // Empty deps - runs once after mount

  // Update markers and map view when locations change and map is ready
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || typeof window === 'undefined' || !mapReady) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => {
      if (marker) {
        marker.remove();
      }
    });

    // Reset markers array
    markersRef.current = [null, null, null];

    // Define locations in order: [volunteer, donor, ngo]
    const locations: Location[] = [volunteerLocation, donorLocation, ngoLocation];
    const colors: string[] = ['blue', 'green', 'red'];

    // Collect all valid locations for bounds fitting
    const validLocations: LngLatLike[] = [];

    // Create markers for each location
    locations.forEach((loc, index) => {
      if (loc.latitude !== null && loc.longitude !== null) {
        const lngLat: LngLatLike = [loc.longitude, loc.latitude];
        validLocations.push(lngLat);

        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.style.width = '20px';
        markerEl.style.height = '20px';
        markerEl.style.backgroundColor = colors[index];
        markerEl.style.borderRadius = '50%';
        markerEl.style.border = '2px solid white';
        markerEl.style.boxShadow = '0 0 0 2px rgba(0,0,0,0.2)';
        markerEl.style.cursor = 'pointer';
        markerEl.title = loc.label;

        // Add popup
        const popup = new Popup({ offset: 25 }).setText(loc.label);

        // Create and store marker
        const marker = new Marker(markerEl)
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map);

        markersRef.current[index] = marker;
      }
    });

    // Fit bounds to show all locations
    if (validLocations.length > 0) {
      const bounds = new LngLatBounds();
      validLocations.forEach((lngLat) => bounds.extend(lngLat));

      // Add some padding
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    } else {
      // If no valid locations, reset to default view
      map.jumpTo({
        center: [0, 0],
        zoom: 1,
      });
    }
  }, [
    mapReady,
    volunteerLocation.latitude,
    volunteerLocation.longitude,
    donorLocation.latitude,
    donorLocation.longitude,
    ngoLocation.latitude,
    ngoLocation.longitude,
  ]);

  return (
    <>
      <div ref={mapRef} className={`relative h-64 w-full rounded-lg ${className}`} />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
    </>
  );
}