"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";

import { ENV } from "@/lib/env";

type LatLng = { lat: number; lng: number };

export type PropertyLocation = LatLng & { address?: string };

type Props = {
  value?: PropertyLocation;
  onChange: (location: PropertyLocation) => void;
  className?: string;
  disabled?: boolean;
  mapHeight?: number;
  fallbackCenter?: LatLng;
};

const DUBAI_CENTER: LatLng = { lat: 25.2048, lng: 55.2708 };

const MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: "greedy",
};

function isValidCoordinatePair(value: unknown): value is LatLng {
  if (!value || typeof value !== "object") return false;
  const lat = (value as { lat?: unknown }).lat;
  const lng = (value as { lng?: unknown }).lng;
  return (
    typeof lat === "number" &&
    Number.isFinite(lat) &&
    lat >= -90 &&
    lat <= 90 &&
    typeof lng === "number" &&
    Number.isFinite(lng) &&
    lng >= -180 &&
    lng <= 180
  );
}

function normalizePosition(value: unknown, fallbackCenter?: LatLng): LatLng {
  if (isValidCoordinatePair(value)) return value;
  if (isValidCoordinatePair(fallbackCenter)) return fallbackCenter;
  return DUBAI_CENTER;
}

function PropertyLocationPickerLoaded(props: Props & { apiKey: string }) {
  const { apiKey, value, onChange, className, disabled, mapHeight, fallbackCenter } = props;
  const position = useMemo(() => normalizePosition(value, fallbackCenter), [value, fallbackCenter]);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const geocoderRef = useRef<google.maps.Geocoder | null>(null);
  const reverseLookupIdRef = useRef(0);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "property-location-picker-google-maps",
    googleMapsApiKey: apiKey,
  });

  useEffect(() => {
    console.log("Map Value:", value);
  }, [value]);

  useEffect(() => {
    console.log("Marker Position:", position);
  }, [position]);

  const reverseGeocode = useCallback(
    (coords: LatLng) => {
      if (typeof window === "undefined" || !window.google?.maps) return;
      if (!geocoderRef.current) geocoderRef.current = new window.google.maps.Geocoder();

      const requestId = ++reverseLookupIdRef.current;
      setIsGeocoding(true);

      geocoderRef.current.geocode({ location: coords }, (results, status) => {
        if (requestId !== reverseLookupIdRef.current) return;
        setIsGeocoding(false);

        if (status === "OK" && results?.[0]) {
          onChange({ ...coords, address: results[0].formatted_address });
        }
      });
    },
    [onChange]
  );

  const applyLocation = useCallback(
    (next: LatLng) => {
      onChange(next);
      reverseGeocode(next);
    },
    [onChange, reverseGeocode]
  );

  useEffect(() => {
    return () => {
      reverseLookupIdRef.current += 1;
    };
  }, []);

  const readEventPosition = useCallback((event: google.maps.MapMouseEvent): LatLng | null => {
    if (!event.latLng) return null;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  }, []);

  const handleMapClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (disabled) return;
      const next = readEventPosition(event);
      if (!next) return;
      applyLocation(next);
    },
    [applyLocation, disabled, readEventPosition]
  );

  const handleMarkerDragEnd = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (disabled) return;
      const next = readEventPosition(event);
      if (!next) return;
      applyLocation(next);
    },
    [applyLocation, disabled, readEventPosition]
  );

  const containerStyle = useMemo(
    () => ({ width: "100%", height: `${Math.max(280, mapHeight ?? 400)}px` }),
    [mapHeight]
  );

  if (loadError) {
    return (
      <div className={className ?? "space-y-3"}>
        <div className="rounded-2xl border border-danger/30 bg-danger/12 p-4 text-sm text-danger">
          Google Maps failed to load. Verify billing, Maps JavaScript API access, and referrer restrictions for this key.
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={className ?? "space-y-3"}>
        <div
          className="overflow-hidden rounded-2xl border border-line/70 bg-warm-base"
          style={containerStyle}
        >
          <div className="flex h-full items-center justify-center px-3 text-sm text-secondary">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className ?? "space-y-3"}>
      <div className="overflow-hidden rounded-2xl border border-line/70">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={position}
          zoom={12}
          options={MAP_OPTIONS}
          onClick={handleMapClick}
        >
          <MarkerF
            position={position}
            draggable={!disabled}
            onDragEnd={handleMarkerDragEnd}
          />
        </GoogleMap>
      </div>

      {isGeocoding ? (
        <div className="rounded-xl border border-line/70 bg-surface px-3 py-2 text-xs text-secondary">
          Resolving address...
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-line/70 bg-surface px-3 py-2 text-xs text-secondary">
          <span className="font-semibold text-primary">Latitude:</span>{" "}
          {position.lat.toFixed(6)}
        </div>
        <div className="rounded-xl border border-line/70 bg-surface px-3 py-2 text-xs text-secondary">
          <span className="font-semibold text-primary">Longitude:</span>{" "}
          {position.lng.toFixed(6)}
        </div>
      </div>
    </div>
  );
}

export default function PropertyLocationPicker(props: Props) {
  const apiKey = ENV.googleMapsApiKey;

  if (!apiKey) {
    return (
      <div className={props.className ?? "space-y-3"}>
        <div className="rounded-2xl border border-line/80 bg-warm-base p-4 text-sm text-secondary">
          Map picker unavailable. Configure <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> for this environment.
        </div>
      </div>
    );
  }

  return <PropertyLocationPickerLoaded {...props} apiKey={apiKey} />;
}
