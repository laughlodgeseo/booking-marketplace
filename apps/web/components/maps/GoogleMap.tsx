"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ENV } from "@/lib/env";
import type { MapPoint } from "@/lib/types/search";

type LatLng = { lat: number; lng: number };
type ViewportBounds = { north: number; south: number; east: number; west: number };

type MapMarkerHandle = {
  clear: () => void;
};

type MapHandle = {
  map: google.maps.Map;
  markers: MapMarkerHandle[];
};

type GoogleMapsWithMarkerLib = typeof google.maps & {
  marker?: {
    AdvancedMarkerElement?: typeof google.maps.marker.AdvancedMarkerElement;
  };
};
type GoogleMapsWithImportLibrary = typeof google.maps & {
  importLibrary?: (libraryName: string) => Promise<unknown>;
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
      if (typeof window !== "undefined" && (window as unknown as { google?: { maps?: unknown } }).google?.maps) {
        resolve();
        return;
      }
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

async function resolveMapConstructor(): Promise<typeof google.maps.Map> {
  const mapsWithImport = google.maps as GoogleMapsWithImportLibrary;

  if (typeof mapsWithImport.importLibrary === "function") {
    const mapsLib = (await mapsWithImport.importLibrary("maps")) as google.maps.MapsLibrary;
    try {
      await mapsWithImport.importLibrary("marker");
    } catch {
      // Marker library is optional for fallback markers.
    }
    if (typeof mapsLib.Map === "function") return mapsLib.Map;
  }

  if (typeof google.maps.Map === "function") return google.maps.Map;

  await new Promise<void>((resolve, reject) => {
    const deadline = Date.now() + 2500;
    const tick = () => {
      if (typeof google.maps.Map === "function") {
        resolve();
        return;
      }
      if (Date.now() >= deadline) {
        reject(new Error("Google Maps Map constructor unavailable after script load."));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });

  return google.maps.Map;
}

function clearMarkers(markers: MapMarkerHandle[]) {
  for (const m of markers) m.clear();
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

type PinCardDom = {
  root: HTMLDivElement;
};

function createPinCard(args: {
  title: string;
  priceText: string;
  imageUrl: string | null;
  imageAlt: string;
  meta: string | null;
  expanded: boolean;
  emphasized: boolean;
}): PinCardDom {
  const root = document.createElement("div");
  root.style.display = "flex";
  root.style.alignItems = "center";
  root.style.gap = args.expanded ? "10px" : "6px";
  root.style.maxWidth = args.expanded ? "310px" : "150px";
  root.style.width = args.expanded ? "310px" : "150px";
  root.style.padding = args.expanded ? "8px" : "5px";
  root.style.borderRadius = args.expanded ? "16px" : "12px";
  root.style.border = args.emphasized
    ? "1px solid rgba(79,70,229,0.9)"
    : "1px solid rgba(15,23,42,0.16)";
  root.style.background = "rgba(255,255,255,0.98)";
  root.style.backdropFilter = "blur(3px)";
  root.style.boxShadow = args.emphasized
    ? "0 16px 34px rgba(79,70,229,0.28)"
    : "0 12px 28px rgba(15,23,42,0.2)";
  root.style.transform = args.expanded ? "scale(1.02)" : "scale(1)";
  root.style.transition = "transform 160ms ease, box-shadow 160ms ease, width 160ms ease";
  root.style.cursor = "pointer";

  const thumb = document.createElement("div");
  thumb.style.width = args.expanded ? "96px" : "36px";
  thumb.style.height = args.expanded ? "72px" : "36px";
  thumb.style.flex = args.expanded ? "0 0 96px" : "0 0 36px";
  thumb.style.overflow = "hidden";
  thumb.style.borderRadius = args.expanded ? "12px" : "9px";
  thumb.style.background = "linear-gradient(140deg, #e2e8f0, #cbd5e1)";
  thumb.style.position = "relative";
  thumb.style.boxShadow = "inset 0 0 0 1px rgba(15,23,42,0.08)";

  if (args.imageUrl) {
    const img = document.createElement("img");
    img.src = args.imageUrl;
    img.alt = args.imageAlt;
    img.loading = "lazy";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    thumb.appendChild(img);
  }

  const content = document.createElement("div");
  content.style.minWidth = "0";
  content.style.display = "flex";
  content.style.flexDirection = "column";
  content.style.gap = args.expanded ? "4px" : "2px";

  const title = document.createElement("div");
  title.textContent = args.title;
  title.style.fontSize = args.expanded ? "12px" : "10px";
  title.style.fontWeight = "700";
  title.style.lineHeight = "1.2";
  title.style.color = "#0f172a";
  title.style.display = "-webkit-box";
  title.style.webkitLineClamp = args.expanded ? "2" : "1";
  title.style.webkitBoxOrient = "vertical";
  title.style.overflow = "hidden";

  const price = document.createElement("div");
  price.textContent = args.priceText;
  price.style.fontSize = args.expanded ? "12px" : "10px";
  price.style.fontWeight = "700";
  price.style.color = "#3730a3";
  price.style.whiteSpace = "nowrap";

  content.appendChild(title);

  if (args.expanded && args.meta) {
    const meta = document.createElement("div");
    meta.textContent = args.meta;
    meta.style.fontSize = "10px";
    meta.style.fontWeight = "500";
    meta.style.color = "#64748b";
    meta.style.display = "-webkit-box";
    meta.style.webkitLineClamp = "1";
    meta.style.webkitBoxOrient = "vertical";
    meta.style.overflow = "hidden";
    content.appendChild(meta);
  }

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.alignItems = "center";
  footer.style.justifyContent = args.expanded ? "space-between" : "flex-start";
  footer.style.gap = "6px";
  footer.appendChild(price);

  if (args.expanded) {
    const cta = document.createElement("span");
    cta.textContent = "View";
    cta.style.fontSize = "10px";
    cta.style.fontWeight = "700";
    cta.style.color = "#1e1b4b";
    cta.style.background = "rgba(99,102,241,0.16)";
    cta.style.padding = "3px 7px";
    cta.style.borderRadius = "999px";
    cta.style.border = "1px solid rgba(99,102,241,0.28)";
    footer.appendChild(cta);
  }

  content.appendChild(footer);

  root.appendChild(thumb);
  root.appendChild(content);
  return { root };
}

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
    center,
    zoom,
    points,
    className,
    onMarkerClick,
    onMarkerOpen,
    hoveredSlug,
    activeSlug,
    onViewportChanged,
    viewportDebounceMs,
  } = props;

  const elRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<MapHandle | null>(null);

  const [ready, setReady] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [markerHoverSlug, setMarkerHoverSlug] = useState<string | null>(null);

  const apiKey = ENV.googleMapsApiKey;
  const mapIdRef = useRef<string | null>(ENV.googleMapsMapId);
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

        const MapCtor = await resolveMapConstructor();
        if (cancelled || !elRef.current) return;

        const map = new MapCtor(elRef.current, {
          center,
          zoom,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: "greedy",
          ...(mapIdRef.current ? { mapId: mapIdRef.current } : {}),
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

    const mapId = mapIdRef.current;
    const mapsWithMarkerLib = google.maps as GoogleMapsWithMarkerLib;
    const AdvancedMarkerCtor = mapId ? mapsWithMarkerLib.marker?.AdvancedMarkerElement : undefined;

    for (const p of points) {
      const position = { lat: p.lat, lng: p.lng };
      const slug = p.slug;
      const priceText =
        typeof p.priceFrom === "number"
          ? formatMoney(p.priceFrom, p.currency)
          : `${p.currency} --`;
      const title = (p.title ?? "Property").trim() || "Property";
      const metaParts: string[] = [];
      if (typeof p.bedrooms === "number" && p.bedrooms > 0) metaParts.push(`${p.bedrooms} bd`);
      if (typeof p.bathrooms === "number" && p.bathrooms > 0) metaParts.push(`${p.bathrooms} ba`);
      if (p.area?.trim()) metaParts.push(p.area.trim());
      const isExpanded = Boolean(slug && (slug === hoveredSlug || slug === activeSlug || slug === markerHoverSlug));
      const isEmphasized = isExpanded;

      if (AdvancedMarkerCtor) {
        try {
          const card = createPinCard({
            title,
            priceText,
            imageUrl: p.coverImage?.url ?? null,
            imageAlt: p.coverImage?.alt ?? title,
            meta: metaParts.length > 0 ? metaParts.join(" • ") : null,
            expanded: isExpanded,
            emphasized: isEmphasized,
          });
          const content = card.root;

          const onEnter =
            slug
              ? () => {
                  setMarkerHoverSlug(slug);
                }
              : null;
          const onLeave =
            slug
              ? () => {
                  setMarkerHoverSlug((prev) => (prev === slug ? null : prev));
                }
              : null;

          if (onEnter && onLeave) {
            content.addEventListener("pointerenter", onEnter);
            content.addEventListener("pointerleave", onLeave);
          }

          const openClickListener =
            onMarkerOpen && slug && isExpanded
              ? (event: Event) => {
                  event.stopPropagation();
                  onMarkerOpen(slug);
                }
              : null;
          if (openClickListener) {
            content.addEventListener("click", openClickListener);
          }

          const marker = new AdvancedMarkerCtor({
            map: h.map,
            position,
            title,
            content,
            gmpClickable: Boolean(onMarkerClick && slug),
          });

          let clickListener: google.maps.MapsEventListener | null = null;
          if (onMarkerClick && slug && typeof marker.addListener === "function") {
            clickListener = marker.addListener("gmp-click", () => onMarkerClick(slug));
          }

          h.markers.push({
            clear: () => {
              if (openClickListener) {
                content.removeEventListener("click", openClickListener);
              }
              if (onEnter && onLeave) {
                content.removeEventListener("pointerenter", onEnter);
                content.removeEventListener("pointerleave", onLeave);
              }
              clickListener?.remove();
              marker.map = null;
            },
          });
          continue;
        } catch {
          // Fall through to classic markers if advanced marker rendering fails.
        }
      }

      const marker = new google.maps.Marker({
        map: h.map,
        position,
        title,
        label: {
          text: priceText,
          fontSize: "12px",
          fontWeight: "600",
        },
        zIndex: isEmphasized ? 20 : undefined,
      });

      const clickListener =
        onMarkerClick && slug
          ? marker.addListener("click", () => onMarkerClick(slug))
          : null;

      h.markers.push({
        clear: () => {
          clickListener?.remove();
          marker.setMap(null);
        },
      });
    }
  }, [activeSlug, hoveredSlug, markerHoverSlug, onMarkerClick, onMarkerOpen, points, ready]);

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
              Check: billing enabled, Maps JavaScript API is enabled, and key referrers include
              <code>http://localhost:3000/*</code>, <code>https://rentpropertyuae.com/*</code>,
              and <code>https://www.rentpropertyuae.com/*</code>.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <div ref={elRef} className={safeClassName} />;
}
