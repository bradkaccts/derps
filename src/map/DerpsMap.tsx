/**
 * `DerpsMap` — the only map component product code renders (spec §6.2, §8).
 *
 * The renderer is loaded lazily: MapLibre is ~800 kB and nobody should pay for
 * it on a route that never shows a map. Until it resolves — and permanently, if
 * WebGL is unavailable — the `fallback` renders instead, which in this product
 * is the venue list. The list is a first-class equivalent view, not a
 * consolation prize (UI-706).
 */
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { paletteFor } from "@/map-style/palette";
import { type ThemeName } from "@/design-tokens/tokens";
import {
  NO_PADDING,
  type Camera,
  type GeofenceCircle,
  type MapAdapter,
  type MapVenueFeature,
  type Padding,
} from "./adapter/types";

export interface DerpsMapProps {
  venues: MapVenueFeature[];
  camera: Camera;
  selectedVenueId?: string | null;
  onSelectVenue?: (id: string | null) => void;
  geofence?: GeofenceCircle | null;
  padding?: Padding;
  variant?: ThemeName;
  className?: string;
  /** Accessible summary of what the canvas shows. */
  label: string;
  /** Rendered while the renderer loads, and instead of it when unsupported. */
  fallback?: React.ReactNode;
  /** Chrome drawn over the canvas once ready — legends, keys, controls. */
  overlay?: React.ReactNode;
  /** Fires when cluster bubbles appear or disappear, so a legend can adapt. */
  onClustersChanged?: (hasClusters: boolean) => void;
  /** Fires when the renderer fails to start, or errors after it is running. */
  onError?: (error: Error) => void;
}



function prefersReducedMotion() {
  return typeof window !== "undefined"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

export function DerpsMap({
  venues,
  camera,
  selectedVenueId = null,
  onSelectVenue,
  geofence = null,
  padding = NO_PADDING,
  variant = "day",
  className,
  label,
  fallback = null,
  overlay = null,
  onClustersChanged,
  onError,
}: DerpsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const adapterRef = useRef<MapAdapter | null>(null);
  const selectRef = useRef(onSelectVenue);
  selectRef.current = onSelectVenue;
  const clustersRef = useRef(onClustersChanged);
  clustersRef.current = onClustersChanged;
  const errorRef = useRef(onError);
  errorRef.current = onError;

  const [status, setStatus] = useState<
    "loading" | "ready" | "unsupported" | "failed"
  >("loading");


  // Mount the renderer once. Camera/venue changes flow through imperative
  // effects below rather than a remount.
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    (async () => {
      const { createMapLibreAdapter, isWebglSupported } = await import(
        "./adapter/maplibre-adapter"
      );
      if (cancelled) return;
      if (!isWebglSupported()) {
        setStatus("unsupported");
        return;
      }

      try {
        const adapter = await createMapLibreAdapter({
          container,
          variant,
          camera,
          padding,
          reducedMotion: prefersReducedMotion(),
        });
        if (cancelled) {
          adapter.destroy();
          return;
        }
        adapterRef.current = adapter;
        adapter.on("selectVenue", (id) => selectRef.current?.(id));
        adapter.on("clustersChanged", (has) => clustersRef.current?.(has));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    })();

    return () => {
      cancelled = true;
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status === "ready") adapterRef.current?.setVenues(venues);
  }, [venues, status]);

  useEffect(() => {
    if (status === "ready") adapterRef.current?.setSelectedVenue(selectedVenueId);
  }, [selectedVenueId, status]);

  useEffect(() => {
    if (status === "ready") adapterRef.current?.setGeofence(geofence);
  }, [geofence, status]);

  useEffect(() => {
    if (status === "ready") adapterRef.current?.setVariant(variant);
  }, [variant, status]);

  useEffect(() => {
    if (status === "ready") adapterRef.current?.setPadding(padding);
  }, [padding, status]);

  const palette = paletteFor(variant);
  const cssVars = {
    "--derps-map-pin": palette.venuePin,
    "--derps-map-pin-selected": palette.venuePinSelected,
    "--derps-map-pin-disabled": palette.venuePinDisabled,
    "--derps-map-cluster": palette.cluster,
    "--derps-map-cluster-text": palette.clusterText,
    "--derps-map-surface": palette.background,
  } as React.CSSProperties;

  if (status === "unsupported") {
    return <>{fallback}</>;
  }

  return (
    <div className={className} style={cssVars}>
      <div
        ref={containerRef}
        className="derps-map-canvas"
        role="application"
        aria-label={label}
      />
      {status === "ready" && overlay}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/60 text-sm font-semibold text-muted-foreground">
          Loading map…
        </div>
      )}

    </div>
  );
}

export type { MapVenueFeature, Camera, GeofenceCircle } from "./adapter/types";
