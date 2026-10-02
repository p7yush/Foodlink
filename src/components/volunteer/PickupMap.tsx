import mapboxgl, { Map, LngLatLike, LngLatBounds, Marker, Popup } from 'mapbox-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BASE_MAP_STYLE, MAP_TILE_ATTRIBUTION, MAP_TILE_ATTRIBUTION_URL } from '@/lib/map-style';
import { isValidCoordinates } from '@/lib/profile-location';
import { planPickupRoute, fetchRouteGeometry } from '@/lib/pickup-route';

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
  pickupStatus: string;
  donorHandoffConfirmedAt: string | null;
};

export default function PickupMap({
  volunteerLocation,
  donorLocation,
  ngoLocation,
  className = '',
  donorHandoffConfirmedAt,
}: PickupMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const markersRef = useRef<(Marker | null)[]>([null, null, null]); // [volunteer, donor, ngo]
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [tileError, setTileError] = useState(false);
  const routeSourceId = 'pickup-route';
  const routeLayerId = 'pickup-route-line';
  const lastRouteRequestRef = useRef(0);
  const routeRequestIdRef = useRef(0);

  
const updateRoute = useCallback(async () => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    // Free OSM-based routing (OSRM): no API key, no billing.
    // Ordered waypoints: volunteer -> donor -> NGO before the donor handoff,
    // volunteer -> NGO after it (never back through the donor).
    const plan = planPickupRoute({
      volunteer: {
        latitude: volunteerLocation.latitude,
        longitude: volunteerLocation.longitude,
      },
      donor: {
        latitude: donorLocation.latitude,
        longitude: donorLocation.longitude,
      },
      ngo: {
        latitude: ngoLocation.latitude,
        longitude: ngoLocation.longitude,
      },
      donorHandoffConfirmedAt,
    });

    if (plan.status !== "ready") {
      // No valid route applies — clear any stale route line.
      if (map.getLayer(routeLayerId)) {
        map.removeLayer(routeLayerId);
      }
      if (map.getSource(routeSourceId)) {
        map.removeSource(routeSourceId);
      }
      return;
    }

    const now = Date.now();
    if (now - lastRouteRequestRef.current < 15000) {
      return;
    }

    lastRouteRequestRef.current = now;
    const requestId = ++routeRequestIdRef.current;

    const geometry = await fetchRouteGeometry(plan.url);

    if (requestId !== routeRequestIdRef.current) {
      return;
    }

    if (!geometry) {
      return;
    }

    const updateSourceAndLayer = () => {
      if (!map.isStyleLoaded()) {
        return;
      }

      const feature = {
        type: 'Feature' as const,
        properties: {},
        geometry,
      };

      const existingSource = map.getSource(routeSourceId);

      if (existingSource && 'setData' in existingSource) {
        (existingSource as mapboxgl.GeoJSONSource).setData(feature);
      } else {
        map.addSource(routeSourceId, {
          type: 'geojson',
          data: feature,
        });
      }

      if (!map.getLayer(routeLayerId)) {
        map.addLayer({
          id: routeLayerId,
          type: 'line',
          source: routeSourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 5,
          },
        });
      }
    };

    if (map.isStyleLoaded()) {
      updateSourceAndLayer();
    } else {
      map.once('load', updateSourceAndLayer);
    }
  }, [
    volunteerLocation.latitude,
    volunteerLocation.longitude,
    donorLocation.latitude,
    donorLocation.longitude,
    ngoLocation.latitude,
    ngoLocation.longitude,
    donorHandoffConfirmedAt,
  ]);

// Initialize map - runs once after mount
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) {
      return;
    }

    // Initialize map
    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: BASE_MAP_STYLE,
      attributionControl: false,
      center: [0, 0], // Will be updated when we have locations
      zoom: 1,
    });

    mapInstanceRef.current = map;
    map.once('load', () => {
      setMapReady(true);
      setMapError("");
    });
    map.on('error', (event) => {
      if (!map.isStyleLoaded()) {
        setMapError("The map tiles could not be loaded. Check your connection and try again.");
        return;
      }
      // A raster tile failed after the style loaded — surface it instead of
      // leaving a blank patch where streets should be.
      const tile = (event as unknown as { tile?: unknown } | null)?.tile;
      if (tile) {
        setTileError(true);
      }
    });

    // Clean up on unmount
    return () => {
      // Remove all markers
      markersRef.current.forEach((marker) => {
        if (marker) {
          marker.remove();
        }
      });

      if (map !== null) {
        if (map.getLayer(routeLayerId)) {
          map.removeLayer(routeLayerId);
        }

        if (map.getSource(routeSourceId)) {
          map.removeSource(routeSourceId);
        }

        // Remove map
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
      if (loc.latitude !== null && loc.longitude !== null && isValidCoordinates(loc.latitude, loc.longitude)) {
        let lngLat: LngLatLike = [loc.longitude, loc.latitude];

        // Check if this location has the same coordinates as any previous valid location
        // If so, offset it slightly to make both markers visible
        const isDuplicate = validLocations.some(existingLatLng => {
          // Handle LngLatLike as either [number, number] or {lat: number, lng: number}
          const existingLng = Array.isArray(existingLatLng)
            ? existingLatLng[0]
            : ('lng' in existingLatLng ? (existingLatLng as {lng: number}).lng : 0);
          const existingLat = Array.isArray(existingLatLng)
            ? existingLatLng[1]
            : ('lat' in existingLatLng ? (existingLatLng as {lat: number}).lat : 0);
          return existingLng === loc.longitude && existingLat === loc.latitude;
        });

        if (isDuplicate) {
          // Offset by approximately 5-10 meters in a circular pattern
          const offset = 0.0001; // Roughly 10 meters at equator
          const angle = (validLocations.length * Math.PI * 2) / 3; // Spread duplicates evenly
          lngLat = [
            loc.longitude + offset * Math.cos(angle),
            loc.latitude + offset * Math.sin(angle)
          ];
        }

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
      validLocations.forEach((lngLat) => {
        bounds.extend(lngLat);
      });

      // Add some padding
      map.fitBounds(bounds, {
        padding: 50,
        maxZoom: 17,
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
    volunteerLocation,
    donorLocation,
    ngoLocation,
  ]);

  // Update driving route when locations or handoff state changes
    useEffect(() => {
    if (!mapReady) return;
    updateRoute();
    }, [
    mapReady,
    donorHandoffConfirmedAt,
    volunteerLocation.latitude,
    volunteerLocation.longitude,
    donorLocation.latitude,
    donorLocation.longitude,
    ngoLocation.latitude,
    ngoLocation.longitude,
    updateRoute,
  ]);

  return (
    <div className={`relative h-64 w-full overflow-hidden rounded-lg ${className}`}>
      <div ref={mapRef} className="absolute inset-0" style={{ position: 'absolute' }} />
      {tileError && mapReady && !mapError && (
        <p
          role="status"
          className="absolute left-2 top-2 z-10 max-w-[75%] rounded bg-amber-100/95 px-2 py-1 text-[11px] font-medium text-amber-900 shadow"
        >
          Some map tiles failed to load — streets may appear blank. Check your connection and reload.
        </p>
      )}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
          <div className="text-center">
            {mapError ? (
              <p className="p-4 text-sm text-destructive" role="status">{mapError}</p>
            ) : (
              <>
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading map...</p>
              </>
            )}
          </div>
        </div>
      )}
      <a
        href={MAP_TILE_ATTRIBUTION_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 z-10 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-muted-foreground underline"
      >
        {MAP_TILE_ATTRIBUTION}
      </a>
    </div>
  );
}
