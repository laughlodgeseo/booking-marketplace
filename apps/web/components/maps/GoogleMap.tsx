"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ENV } from "@/lib/env";
import type { MapPoint } from "@/lib/types/search";

type LatLng = { lat: number; lng: number };
type ViewportBounds = { north: number; south: number; east: number; west: number };

type MapHandle = {
  map: google.maps.Map;
  markers: google.maps.Marker[];
};

let _mapsInitPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (_mapsInitPromise) return _mapsInitPromise;

  _mapsInitPromise = new Promise<void>((resolve, reject) => {
    // If already loaded (route transitions / strict mode), resolve immediately.
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

    // Classic loader. Works reliably across versions.
    // NOTE: `libraries=marker` enables marker library (for future AdvancedMarker usage).
    const params = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "marker",
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;

    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps script failed to load."));

    document.head.appendChild(script);
  });

  return _mapsInitPromise;
}

function clearMarkers(markers: google.maps.Marker[]) {
  for (const m of markers) m.setMap(null);
  markers.length = 0;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "AED" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function GoogleMap(props: {
  center: LatLng;
  zoom: number;
  points: MapPoint[];
  className?: string;
  onMarkerClick?: (slug: string) => void;
  hoveredSlug?: string | null;
  activeSlug?: string | null;
  onViewportChanged?: (bounds: ViewportBounds) => void | Promise<void>;
  viewportDebounceMs?: number;
}) {
  const {
    center,
    zoom,
    points,
    className,
    onMarkerClick,
    onViewportChanged,
    viewportDebounceMs,
  } = props;

  const elRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<MapHandle | null>(null);

  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const apiKey = ENV.googleMapsApiKey;
  const safeClassName = className ?? "h-[520px] w-full rounded-2xl";

  const canInit = useMemo(() => Boolean(apiKey && apiKey.trim().length > 0), [apiKey]);

  // Init map once
  useEffect(() => {
    if (!canInit) return;
    if (!apiKey) return;
    if (!elRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleMapsScript(apiKey);
        if (cancelled) return;
        if (!elRef.current) return;

        // StrictMode safe: don't recreate map if already created
        if (handleRef.current) {
          setReady(true);
          return;
        }

        const map = new google.maps.Map(elRef.current, {
          center,
          zoom,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });

        handleRef.current = { map, markers: [] };
        setReady(true);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown Google Maps error";
        setErrorMsg(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, canInit, center, zoom]);

  // Update center/zoom
  useEffect(() => {
    const h = handleRef.current;
    if (!h || !ready) return;
    h.map.setCenter(center);
    h.map.setZoom(zoom);
  }, [center, zoom, ready]);

  // Render markers when points change
  useEffect(() => {
    const h = handleRef.current;
    if (!h || !ready) return;

    clearMarkers(h.markers);

    for (const p of points) {
      const marker = new google.maps.Marker({
        map: h.map,
        position: { lat: p.lat, lng: p.lng },
        title: p.title,
        label: {
          text:
            typeof p.priceFrom === "number"
              ? formatMoney(p.priceFrom, p.currency)
              : `${p.currency} --`,
          fontSize: "12px",
          fontWeight: "600",
        },
      });

      const slug = p.slug;
      if (onMarkerClick && slug) {
        marker.addListener("click", () => onMarkerClick?.(slug));
      }

      h.markers.push(marker);
    }
  }, [onMarkerClick, points, ready]);

  // Emit viewport changes after pan/zoom settles.
  useEffect(() => {
    const h = handleRef.current;
    if (!h || !ready || !onViewportChanged) return;

    const debounceMs = viewportDebounceMs ?? 450;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const emit = () => {
      const bounds = h.map.getBounds();
      if (!bounds) return;

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();

      const payload: ViewportBounds = {
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      };

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void onViewportChanged?.(payload);
      }, debounceMs);
    };

    const listener = h.map.addListener("idle", emit);
    emit();

    return () => {
      listener.remove();
      if (timer) clearTimeout(timer);
    };
  }, [onViewportChanged, viewportDebounceMs, ready]);

  if (!apiKey) {
    return (
      <div className={safeClassName}>
        <div className="grid h-full w-full place-items-center rounded-2xl border border-line bg-warm-alt p-6 text-sm text-secondary">
          Add{" "}
          <code className="mx-1 rounded bg-surface px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
          to enable map.
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={safeClassName}>
        <div className="grid h-full w-full place-items-center rounded-2xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
          <div className="max-w-[520px] text-center">
            <div className="font-semibold">Google Maps failed to load</div>
            <div className="mt-2 break-words text-xs text-danger/90">{errorMsg}</div>
            <div className="mt-3 text-xs text-danger/80">
              Check: billing enabled, key restrictions include <code>http://localhost:3000/*</code>,
              and Maps JavaScript API is enabled.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div ref={elRef} className={safeClassName} />;
}
