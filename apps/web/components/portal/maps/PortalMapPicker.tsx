"use client";

import { useEffect, useRef, useState } from "react";

type PickerValue = { lat: number | null; lng: number | null; address?: string | null };
type PickerChange = { lat: number; lng: number; address: string | null };

const DUBAI = { lat: 25.2048, lng: 55.2708 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// ── One-shot script loader ────────────────────────────────────────────────────
let _promise: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (_promise) return _promise;
  _promise = new Promise<void>((resolve, reject) => {
    // Already loaded
    if (typeof window !== "undefined" && (window as unknown as { google?: { maps?: unknown } }).google?.maps) {
      resolve();
      return;
    }

    // Another component already injected the script tag – wait for it
    const existing = document.querySelector("script[data-gm-loader]");
    if (existing) {
      let done = false;
      const ok = () => { if (!done) { done = true; resolve(); } };
      const fail = () => { if (!done) { done = true; reject(new Error("Google Maps script failed to load")); } };
      existing.addEventListener("load", ok);
      existing.addEventListener("error", fail);
      // In case script already fired before we attached the listener
      const t = window.setInterval(() => {
        if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) {
          window.clearInterval(t);
          ok();
        }
      }, 50);
      window.setTimeout(() => { window.clearInterval(t); fail(); }, 15000);
      return;
    }

    // Inject fresh script tag
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&v=weekly&libraries=marker,geocoding`;
    s.async = true;
    s.defer = true;
    s.dataset.gmLoader = "1";
    s.onerror = () => { _promise = null; reject(new Error("Google Maps script failed to load")); };
    s.onload = () => {
      // Poll briefly – google.maps bootstraps asynchronously even after onload
      let waited = 0;
      const t = window.setInterval(() => {
        waited += 50;
        if ((window as unknown as { google?: { maps?: unknown } }).google?.maps) {
          window.clearInterval(t);
          resolve();
        } else if (waited >= 10000) {
          window.clearInterval(t);
          _promise = null;
          reject(new Error("google.maps namespace unavailable after script load"));
        }
      }, 50);
    };
    document.head.appendChild(s);
  });
  return _promise;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function PortalMapPicker(props: {
  value: PickerValue;
  onChange: (next: PickerChange) => void;
  className?: string;
  disabled?: boolean;
}) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const onChangeRef = useRef(props.onChange);
  const mountedRef = useRef(true);

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => { onChangeRef.current = props.onChange; }, [props.onChange]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // ── Build map once ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!API_KEY) { setStatus("error"); setErrorMsg("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set"); return; }
    let cancelled = false;

    async function build() {
      try {
        await loadMaps();
        if (cancelled || !mountedRef.current || !mapDivRef.current) return;

        // Center: use provided coords if valid, else Dubai
        const center =
          typeof props.value.lat === "number" && typeof props.value.lng === "number"
            ? { lat: props.value.lat, lng: props.value.lng }
            : DUBAI;

        // Get Map constructor
        type MapsLib = { Map: typeof google.maps.Map };
        const mapsLib = await (google.maps as unknown as { importLibrary: (n: string) => Promise<unknown> }).importLibrary("maps") as MapsLib;
        if (cancelled || !mountedRef.current || !mapDivRef.current) return;

        const map = new mapsLib.Map(mapDivRef.current, {
          center,
          zoom: 14,
          disableDefaultUI: false,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        mapRef.current = map;

        // Place draggable marker
        let marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker;
        try {
          type MarkerLib = { AdvancedMarkerElement: typeof google.maps.marker.AdvancedMarkerElement };
          const markerLib = await (google.maps as unknown as { importLibrary: (n: string) => Promise<unknown> }).importLibrary("marker") as MarkerLib;
          if (cancelled) return;
          marker = new markerLib.AdvancedMarkerElement({ map, position: center, gmpDraggable: true });
        } catch {
          // Legacy fallback
          marker = new google.maps.Marker({ map, position: center, draggable: true });
        }
        markerRef.current = marker;

        // Shared handler: when pin moves, emit change
        const handleMove = (lat: number, lng: number) => {
          if (!mountedRef.current) return;
          onChangeRef.current({ lat, lng, address: null });
        };

        // Click on map → move pin
        map.addListener("click", (e: google.maps.MapMouseEvent) => {
          if (props.disabled) return;
          const pt = e.latLng;
          if (!pt) return;
          const lat = pt.lat();
          const lng = pt.lng();
          if ("position" in marker) {
            (marker as google.maps.marker.AdvancedMarkerElement).position = { lat, lng };
          } else {
            (marker as google.maps.Marker).setPosition({ lat, lng });
          }
          map.panTo({ lat, lng });
          handleMove(lat, lng);
        });

        // Drag end → emit change
        marker.addListener("dragend", () => {
          if (props.disabled) return;
          let pos: google.maps.LatLng | null = null;
          if ("position" in marker) {
            const p = (marker as google.maps.marker.AdvancedMarkerElement).position;
            if (p) {
              if (typeof (p as google.maps.LatLng).lat === "function") {
                pos = p as google.maps.LatLng;
              } else {
                const lit = p as google.maps.LatLngLiteral;
                pos = new google.maps.LatLng(lit.lat, lit.lng);
              }
            }
          } else {
            pos = (marker as google.maps.Marker).getPosition() ?? null;
          }
          if (pos) handleMove(pos.lat(), pos.lng());
        });

        if (mountedRef.current && !cancelled) setStatus("ready");
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setStatus("error");
          setErrorMsg(err instanceof Error ? err.message : "Failed to load Google Maps");
        }
      }
    }

    void build();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sync pin when parent value changes ────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || status !== "ready") return;
    if (typeof props.value.lat !== "number" || typeof props.value.lng !== "number") return;
    const pos = { lat: props.value.lat, lng: props.value.lng };
    map.setCenter(pos);
    if ("position" in marker) {
      (marker as google.maps.marker.AdvancedMarkerElement).position = pos;
    } else {
      (marker as google.maps.Marker).setPosition(pos);
    }
  }, [props.value.lat, props.value.lng, status]);

  // ── Force tile repaint (handles tab/accordion visibility changes) ─────────
  useEffect(() => {
    const map = mapRef.current;
    const node = mapDivRef.current;
    if (!map || !node || status !== "ready") return;
    const refresh = () => {
      google.maps.event.trigger(map, "resize");
      map.setCenter(mapRef.current!.getCenter()!);
    };
    const t = window.setTimeout(refresh, 0);
    const obs = typeof ResizeObserver !== "undefined" ? new ResizeObserver(refresh) : null;
    obs?.observe(node);
    return () => { window.clearTimeout(t); obs?.disconnect(); };
  }, [status]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (!API_KEY) {
    return (
      <div className="rounded-2xl border border-line/80 bg-warm-base p-4 text-sm text-secondary">
        Map picker unavailable — set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>.
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
        Google Maps failed to load: {errorMsg}
      </div>
    );
  }

  return (
    <div className={props.className ?? "space-y-3"}>
      {/* Map container — inline style guarantees dimensions regardless of CSS loading */}
      <div
        ref={mapDivRef}
        style={{ height: "360px", width: "100%", borderRadius: "16px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.12)" }}
      />
      {status === "loading" && (
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-xs text-muted">
          <span className="h-3 w-3 animate-spin rounded-full border border-brand/30 border-t-brand" />
          Loading map…
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-line/70 bg-surface px-3 py-2 text-xs text-secondary">
          <span className="font-semibold text-primary">Latitude:</span>{" "}
          {typeof props.value.lat === "number" ? props.value.lat.toFixed(6) : "—"}
        </div>
        <div className="rounded-xl border border-line/70 bg-surface px-3 py-2 text-xs text-secondary">
          <span className="font-semibold text-primary">Longitude:</span>{" "}
          {typeof props.value.lng === "number" ? props.value.lng.toFixed(6) : "—"}
        </div>
      </div>
    </div>
  );
}
