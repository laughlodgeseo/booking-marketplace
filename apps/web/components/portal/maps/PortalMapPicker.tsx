"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ENV } from "@/lib/env";

type LatLng = { lat: number; lng: number };

type PickerValue = {
  lat: number | null;
  lng: number | null;
  address?: string | null;
};

type PickerChange = {
  lat: number;
  lng: number;
  address: string | null;
};

type MarkerHandle = {
  setPosition: (point: LatLng) => void;
  getPosition: () => google.maps.LatLng | null;
  setMap: (map: google.maps.Map | null) => void;
  addDragEndListener: (handler: () => void) => google.maps.MapsEventListener | null;
};

type MapHandle = {
  map: google.maps.Map;
  marker: MarkerHandle;
  geocoder: google.maps.Geocoder;
};

type GoogleMapsWithMarkerLib = typeof google.maps & {
  marker?: {
    AdvancedMarkerElement?: typeof google.maps.marker.AdvancedMarkerElement;
  };
};

let mapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && (window as unknown as { google?: unknown }).google) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps-loader="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps script failed to load.")));
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = "1";

    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "marker",
      loading: "async",
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps script failed to load."));
    document.head.appendChild(script);
  });

  return mapsPromise;
}

function createPickerMarker(map: google.maps.Map, position: LatLng, mapId: string | null): MarkerHandle {
  const mapsWithMarkerLib = google.maps as GoogleMapsWithMarkerLib;
  const AdvancedMarkerCtor = mapId ? mapsWithMarkerLib.marker?.AdvancedMarkerElement : undefined;

  if (AdvancedMarkerCtor) {
    const marker = new AdvancedMarkerCtor({
      map,
      position,
      gmpDraggable: true,
    });

    return {
      setPosition: (point) => {
        marker.position = point;
      },
      getPosition: () => {
        const pos = marker.position;
        if (!pos) return null;
        if (typeof (pos as google.maps.LatLng).lat === "function") return pos as google.maps.LatLng;
        const literal = pos as google.maps.LatLngLiteral;
        return new google.maps.LatLng(literal.lat, literal.lng);
      },
      setMap: (nextMap) => {
        marker.map = nextMap;
      },
      addDragEndListener: (handler) =>
        typeof marker.addListener === "function"
          ? marker.addListener("dragend", handler)
          : null,
    };
  }

  const marker = new google.maps.Marker({
    map,
    position,
    draggable: true,
  });

  return {
    setPosition: (point) => marker.setPosition(point),
    getPosition: () => marker.getPosition() ?? null,
    setMap: (nextMap) => marker.setMap(nextMap),
    addDragEndListener: (handler) => marker.addListener("dragend", handler),
  };
}

async function reverseGeocode(geocoder: google.maps.Geocoder, point: LatLng): Promise<string | null> {
  const res = await geocoder.geocode({ location: point });
  const first = Array.isArray(res.results) ? res.results[0] : null;
  const address = typeof first?.formatted_address === "string" ? first.formatted_address.trim() : "";
  return address || null;
}

export function PortalMapPicker(props: {
  value: PickerValue;
  onChange: (next: PickerChange) => void;
  className?: string;
  disabled?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(props.value.address ?? null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<MapHandle | null>(null);
  const onChangeRef = useRef(props.onChange);

  const apiKey = ENV.googleMapsApiKey;
  const mapIdRef = useRef<string | null>(ENV.googleMapsMapId);
  const fallbackCenter = useMemo<LatLng>(() => ({ lat: 25.2048, lng: 55.2708 }), []);

  const selected = useMemo<LatLng>(() => {
    if (typeof props.value.lat === "number" && typeof props.value.lng === "number") {
      return { lat: props.value.lat, lng: props.value.lng };
    }
    return fallbackCenter;
  }, [fallbackCenter, props.value.lat, props.value.lng]);

  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;
    const mapsApiKey = apiKey;
    let cancelled = false;

    async function init() {
      try {
        await loadGoogleMaps(mapsApiKey);
        if (cancelled || !mapRef.current) return;

        if (!handleRef.current) {
          const map = new google.maps.Map(mapRef.current, {
            center: selected,
            zoom: 12,
            disableDefaultUI: false,
            clickableIcons: false,
            gestureHandling: "greedy",
            ...(mapIdRef.current ? { mapId: mapIdRef.current } : {}),
          });

          const marker = createPickerMarker(map, selected, mapIdRef.current);

          const geocoder = new google.maps.Geocoder();

          const applySelection = async (point: LatLng) => {
            marker.setPosition(point);
            map.panTo(point);
            const address = await reverseGeocode(geocoder, point);
            if (cancelled) return;
            setResolvedAddress(address);
            onChangeRef.current({ lat: point.lat, lng: point.lng, address });
          };

          map.addListener("click", (event: google.maps.MapMouseEvent) => {
            if (props.disabled) return;
            const point = event.latLng;
            if (!point) return;
            void applySelection({ lat: point.lat(), lng: point.lng() });
          });

          marker.addDragEndListener(() => {
            if (props.disabled) return;
            const pos = marker.getPosition();
            if (!pos) return;
            void applySelection({ lat: pos.lat(), lng: pos.lng() });
          });

          handleRef.current = { map, marker, geocoder };
        }

        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load map.");
      }
    }

    void init();

    return () => {
      cancelled = true;
    };
  }, [apiKey, props.disabled, selected]);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle || !ready) return;
    handle.map.setCenter(selected);
    handle.marker.setPosition(selected);
  }, [ready, selected]);

  if (!apiKey) {
    return (
      <div className="rounded-2xl border border-line/80 bg-warm-base p-4 text-sm text-secondary">
        Map picker is unavailable. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to enable pin selection.
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/12 p-4 text-sm text-danger">
        {error}
      </div>
    );
  }

  return (
    <div className={props.className ?? "space-y-3"}>
      <div
        ref={mapRef}
        className="h-[320px] w-full overflow-hidden rounded-2xl border border-line/70 bg-warm-base"
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-line/70 bg-surface px-3 py-2 text-xs text-secondary">
          <span className="font-semibold text-primary">Latitude:</span>{" "}
          {typeof props.value.lat === "number" ? props.value.lat.toFixed(6) : "-"}
        </div>
        <div className="rounded-xl border border-line/70 bg-surface px-3 py-2 text-xs text-secondary">
          <span className="font-semibold text-primary">Longitude:</span>{" "}
          {typeof props.value.lng === "number" ? props.value.lng.toFixed(6) : "-"}
        </div>
        <div className="rounded-xl border border-line/70 bg-surface px-3 py-2 text-xs text-secondary sm:col-span-1">
          <span className="font-semibold text-primary">Address:</span>{" "}
          {resolvedAddress || props.value.address || "-"}
        </div>
      </div>
    </div>
  );
}
