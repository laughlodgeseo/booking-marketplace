"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ENV } from "@/lib/env";
import type { MapPoint } from "@/lib/types/search";
import { propertyTypeLabel } from "@/lib/types/property-type";

type LatLng = { lat: number; lng: number };
type ViewportBounds = { north: number; south: number; east: number; west: number };

type MarkerHandle = { remove: () => void };
type MapHandle = { map: google.maps.Map; markers: MarkerHandle[] };

// ── Script loader ─────────────────────────────────────────────────────────────
let _scriptPromise: Promise<void> | null = null;

function hasGoogleMapsReady(): boolean {
  return typeof window !== "undefined" && Boolean((window as unknown as { google?: { maps?: unknown } }).google?.maps);
}

function waitForGoogleMapsReady(timeoutMs = 3000): Promise<void> {
  if (hasGoogleMapsReady()) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      if (hasGoogleMapsReady()) {
        resolve();
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error("Maps script loaded but google.maps is unavailable"));
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

function loadMapsScript(apiKey: string): Promise<void> {
  if (_scriptPromise) return _scriptPromise;
  _scriptPromise = new Promise<void>((resolve, reject) => {
    if (hasGoogleMapsReady()) { resolve(); return; }
    const existing = document.querySelector<HTMLScriptElement>('[data-gm-loader]');
    if (existing) {
      existing.addEventListener("load", () => {
        void waitForGoogleMapsReady().then(resolve).catch(reject);
      });
      existing.addEventListener("error", () => reject(new Error("Maps script failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=marker`;
    s.async = true;
    s.defer = true;
    s.dataset.gmLoader = "1";
    s.onload = () => {
      void waitForGoogleMapsReady().then(resolve).catch(reject);
    };
    s.onerror = () => reject(new Error("Maps script failed to load"));
    document.head.appendChild(s);
  });
  return _scriptPromise;
}

// ── Card HTML ─────────────────────────────────────────────────────────────────
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

function buildCard(args: {
  title: string;
  priceText: string;
  imageUrl: string | null;
  imageAlt: string;
  meta: string | null;
  expanded: boolean;
}): HTMLDivElement {
  const card = document.createElement("div");
  const w = args.expanded ? "280px" : "156px";
  card.style.cssText = `
    display:flex;align-items:center;gap:8px;
    width:${w};padding:${args.expanded ? "8px 10px 8px 8px" : "5px 8px 5px 6px"};
    border-radius:${args.expanded ? "16px" : "12px"};
    border:${args.expanded ? "1.5px solid rgba(79,70,229,0.85)" : "1.5px solid rgba(15,23,42,0.18)"};
    background:#fff;
    box-shadow:${args.expanded ? "0 12px 32px rgba(79,70,229,0.28)" : "0 6px 20px rgba(15,23,42,0.22)"};
    cursor:pointer;user-select:none;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  `.replace(/\s+/g, " ").trim();

  // Thumbnail
  const thumb = document.createElement("div");
  const ts = args.expanded ? "84px" : "38px";
  thumb.style.cssText = `width:${ts};height:${args.expanded ? "64px" : "38px"};flex-shrink:0;overflow:hidden;border-radius:${args.expanded ? "10px" : "7px"};background:linear-gradient(140deg,#e2e8f0,#cbd5e1);`;
  if (args.imageUrl) {
    const img = document.createElement("img");
    img.src = args.imageUrl;
    img.alt = args.imageAlt;
    img.loading = "lazy";
    img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
    img.onerror = () => { img.style.display = "none"; };
    thumb.appendChild(img);
  } else {
    thumb.style.display = "flex";
    thumb.style.alignItems = "center";
    thumb.style.justifyContent = "center";
    thumb.style.fontSize = "20px";
    thumb.textContent = "🏠";
  }

  // Text
  const body = document.createElement("div");
  body.style.cssText = "min-width:0;flex:1;display:flex;flex-direction:column;gap:2px;";

  const titleEl = document.createElement("div");
  titleEl.textContent = args.title;
  titleEl.style.cssText = `font-size:${args.expanded ? "12px" : "11px"};font-weight:700;color:#0f172a;overflow:hidden;display:-webkit-box;-webkit-line-clamp:${args.expanded ? 2 : 1};-webkit-box-orient:vertical;line-height:1.25;`;

  const priceEl = document.createElement("div");
  priceEl.textContent = args.priceText;
  priceEl.style.cssText = `font-size:${args.expanded ? "13px" : "12px"};font-weight:800;color:#3730a3;white-space:nowrap;`;

  body.appendChild(titleEl);

  if (args.expanded && args.meta) {
    const metaEl = document.createElement("div");
    metaEl.textContent = args.meta;
    metaEl.style.cssText = "font-size:10px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    body.appendChild(metaEl);
  }

  const row = document.createElement("div");
  row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:4px;margin-top:2px;";
  row.appendChild(priceEl);

  if (args.expanded) {
    const cta = document.createElement("span");
    cta.textContent = "View →";
    cta.style.cssText = "font-size:10px;font-weight:700;color:#1e1b4b;background:rgba(99,102,241,0.14);padding:2px 7px;border-radius:999px;border:1px solid rgba(99,102,241,0.3);white-space:nowrap;";
    row.appendChild(cta);
  }

  body.appendChild(row);
  card.appendChild(thumb);
  card.appendChild(body);
  return card;
}

// ── OverlayView-based card marker ─────────────────────────────────────────────
// Works without a Map ID. Positions a DOM card at a lat/lng.
function createCardMarker(args: {
  map: google.maps.Map;
  position: google.maps.LatLng;
  card: HTMLDivElement;
  zIndex: number;
  onClick: () => void;
}): MarkerHandle {
  const { map, position, card, zIndex, onClick } = args;

  // Wrapper absolutely positioned over the map canvas
  const wrapper = document.createElement("div");
  wrapper.style.cssText = `position:absolute;z-index:${zIndex};transform:translate(-50%,-100%);margin-top:-6px;pointer-events:auto;`;
  wrapper.appendChild(card);

  card.addEventListener("click", (e) => { e.stopPropagation(); onClick(); });

  // We need google.maps.OverlayView — available after script load
  const OverlayView = google.maps.OverlayView;

  // Dynamic subclass (safe: google.maps is loaded at this point)
  const overlay = new (class extends OverlayView {
    onAdd() {
      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(wrapper);
    }
    draw() {
      const proj = this.getProjection();
      if (!proj) return;
      const pt = proj.fromLatLngToDivPixel(position);
      if (!pt) return;
      wrapper.style.left = `${pt.x}px`;
      wrapper.style.top = `${pt.y}px`;
    }
    onRemove() {
      wrapper.parentNode?.removeChild(wrapper);
    }
  })() as InstanceType<typeof OverlayView> & { setMap: (m: google.maps.Map | null) => void };

  overlay.setMap(map);

  return {
    remove: () => {
      card.removeEventListener("click", onClick);
      overlay.setMap(null);
    },
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GoogleMap(props: {
  center: LatLng;
  zoom: number;
  points: MapPoint[];
  className?: string;
  onMarkerClick?: (slug: string) => void;
  onMarkerOpen?: (slug: string) => void;
  hoveredSlug?: string | null;
  activeSlug?: string | null;
  onViewportChanged?: (bounds: ViewportBounds) => void | Promise<void>;
  viewportDebounceMs?: number;
}) {
  const {
    center, zoom, points, className,
    onMarkerClick, onMarkerOpen,
    hoveredSlug, activeSlug,
    onViewportChanged, viewportDebounceMs,
  } = props;

  const elRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<MapHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hoverSlug, setHoverSlug] = useState<string | null>(null);

  const apiKey = ENV.googleMapsApiKey;
  const mapId = ENV.googleMapsMapId;
  const safeClass = className ?? "h-[520px] w-full rounded-2xl";
  const canInit = useMemo(() => Boolean(apiKey?.trim()), [apiKey]);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canInit || !apiKey || !elRef.current) return;
    if (handleRef.current) { setReady(true); return; }

    let cancelled = false;
    (async () => {
      try {
        await loadMapsScript(apiKey);
        if (cancelled || !elRef.current) return;

        // Resolve Map constructor
        const gm = google.maps as typeof google.maps & { importLibrary?: (n: string) => Promise<unknown> };
        const MapCtor = typeof gm.importLibrary === "function"
          ? ((await gm.importLibrary("maps")) as { Map: typeof google.maps.Map }).Map
          : google.maps.Map;

        if (cancelled || !elRef.current) return;

        const map = new MapCtor(elRef.current, {
          center, zoom,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          ...(mapId ? { mapId } : {}),
        });

        handleRef.current = { map, markers: [] };
        setReady(true);
      } catch (e) {
        if (!cancelled) setErrorMsg(e instanceof Error ? e.message : "Unknown error");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, canInit]);

  // ── Sync center / zoom ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = handleRef.current;
    if (!h || !ready) return;
    h.map.setCenter(center);
    h.map.setZoom(zoom);
  }, [center, zoom, ready]);

  // ── Render card markers via OverlayView ─────────────────────────────────────
  useEffect(() => {
    const h = handleRef.current;
    if (!h || !ready) return;

    // Clear old markers
    for (const m of h.markers) m.remove();
    h.markers.length = 0;

    for (const p of points) {
      const slug = p.slug ?? null;
      if (!slug) continue;

      const isExpanded = slug === hoveredSlug || slug === activeSlug || slug === hoverSlug;
      const priceText = typeof p.priceFrom === "number"
        ? formatMoney(p.priceFrom, p.currency)
        : `${p.currency} --`;
      const title = (p.title ?? "Property").trim() || "Property";
      const metaParts: string[] = [];
      if (p.propertyType) metaParts.push(propertyTypeLabel(p.propertyType));
      if (typeof p.bedrooms === "number" && p.bedrooms > 0) metaParts.push(`${p.bedrooms} bd`);
      if (typeof p.bathrooms === "number" && p.bathrooms > 0) metaParts.push(`${p.bathrooms} ba`);
      if (p.area?.trim()) metaParts.push(p.area.trim());

      const card = buildCard({
        title,
        priceText,
        imageUrl: p.coverImage?.url ?? null,
        imageAlt: p.coverImage?.alt ?? title,
        meta: metaParts.length > 0 ? metaParts.join(" · ") : null,
        expanded: isExpanded,
      });

      // Hover expand
      card.addEventListener("pointerenter", () => setHoverSlug(slug));
      card.addEventListener("pointerleave", () => setHoverSlug((s) => s === slug ? null : s));

      const navigate = () => {
        if (onMarkerOpen) onMarkerOpen(slug);
        else if (onMarkerClick) onMarkerClick(slug);
      };

      const position = new google.maps.LatLng(p.lat, p.lng);
      const handle = createCardMarker({
        map: h.map,
        position,
        card,
        zIndex: isExpanded ? 999 : 1,
        onClick: navigate,
      });

      h.markers.push(handle);
    }
  }, [activeSlug, hoveredSlug, hoverSlug, onMarkerClick, onMarkerOpen, points, ready]);

  // ── Viewport emitter ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = handleRef.current;
    if (!h || !ready || !onViewportChanged) return;
    const ms = viewportDebounceMs ?? 450;
    let t: ReturnType<typeof setTimeout> | null = null;
    const emit = () => {
      const bounds = h.map.getBounds();
      if (!bounds) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      if (t) clearTimeout(t);
      t = setTimeout(() => void onViewportChanged({ north: ne.lat(), south: sw.lat(), east: ne.lng(), west: sw.lng() }), ms);
    };
    const l = h.map.addListener("idle", emit);
    emit();
    return () => { l.remove(); if (t) clearTimeout(t); };
  }, [onViewportChanged, viewportDebounceMs, ready]);

  // ── Error / loading states ──────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className={safeClass}>
        <div className="grid h-full w-full place-items-center rounded-2xl border border-line bg-warm-alt p-6 text-sm text-secondary">
          Add <code className="mx-1 rounded bg-surface px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable the map.
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className={safeClass}>
        <div className="grid h-full w-full place-items-center rounded-2xl border border-danger/30 bg-danger/12 p-6 text-sm text-danger">
          <div className="max-w-130 text-center">
            <div className="font-semibold">Google Maps failed to load</div>
            <div className="mt-2 wrap-break-word text-xs opacity-90">{errorMsg}</div>
            <div className="mt-3 text-xs opacity-80">
              Check: billing enabled, Maps JavaScript API enabled, and key referrers include{" "}
              <code>http://localhost:3000/*</code> and <code>https://rentpropertyuae.com/*</code>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div ref={elRef} className={safeClass} />;
}
